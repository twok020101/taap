import { coefficients } from './coefficients'
import { getReferenceContext } from '@/lib/baselines'
import type { Baseline, CityConfig, ModelOutput, SliderState, SimContext } from '@/cities/types'

export type CoefficientValues = Partial<Record<'canopy' | 'builtUp' | 'water' | 'vehicles', number>>

/**
 * Propagate a coefficient's [low, high] interval through a signed linear term.
 *
 * `delta * coeff` has its minimum at whichever of {delta*low, delta*high} is
 * smaller — the sign of `delta` decides which endpoint lands on which side,
 * and this helper hides that bookkeeping from the caller.
 */
function rangedContrib(
  delta: number,
  low: number,
  central: number,
  high: number,
): { low: number; central: number; high: number } {
  const a = delta * low
  const b = delta * high
  return {
    low: Math.min(a, b),
    central: delta * central,
    high: Math.max(a, b),
  }
}

/**
 * Deterministic demonstration, not a calibrated physical forecast.
 * Outputs are illustrative temperature-equivalent and PM2.5-equivalent values.
 * Land-use terms are relative to mixed-year reference inputs; month, zone, AOD
 * and PM2.5 wind terms are relative to the explicit city reference context.
 * Low/high intervals vary selected assumptions only, not all uncertainty.
 * Raw values and clipping flags are retained so saturation cannot imply certainty.
 */
export function simulate(
  city: CityConfig,
  baseline: Baseline,
  sliders: SliderState,
  ctx: SimContext = getReferenceContext(city),
  coefficientValues: CoefficientValues = {},
): ModelOutput {
  const o = city.coefficientOverrides
  const c = {
    ...coefficients,
    canopy: { ...coefficients.canopy, central: coefficientValues.canopy ?? coefficients.canopy.central },
    builtUp: { ...coefficients.builtUp, central: coefficientValues.builtUp ?? coefficients.builtUp.central },
    water: { ...coefficients.water, central: coefficientValues.water ?? coefficients.water.central },
    vehicles: { ...coefficients.vehicles, central: coefficientValues.vehicles ?? coefficients.vehicles.central },
    monsoonOffsets: o?.monsoonOffsets ?? coefficients.monsoonOffsets,
    windAdvectionMultiplier: { ...coefficients.windAdvectionMultiplier, ...o?.windAdvectionMultiplier },
    windPm25Offset: { ...coefficients.windPm25Offset, ...o?.windPm25Offset },
    aod: { ...coefficients.aod, referenceAod: o?.aod?.referenceAod ?? coefficients.aod.referenceAod },
  }
  const tod = ctx.timeOfDay ?? 'day'
  const referenceContext = getReferenceContext(city)

  // ── 1. Land-use deltas ──────────────────────────────────────────────────

  // Canopy delta: positive means canopy increased (cooling), negative = warming
  const canopyDeltaPp = sliders.canopyPct - baseline.canopyPct
  // Loss of canopy warms, gain cools — coefficient is per −1pp, so negate
  const canopyBand = rangedContrib(-canopyDeltaPp, c.canopy.low, c.canopy.central, c.canopy.high)
  const tempFromCanopy = canopyBand.central

  // Built-up delta: positive means more impervious surface (warming)
  const builtUpDeltaPp = sliders.builtUpPct - baseline.builtUpPct
  const builtUpBand = rangedContrib(builtUpDeltaPp, c.builtUp.low, c.builtUp.central, c.builtUp.high)
  const tempFromBuiltUp = builtUpBand.central

  // Water delta: positive means more water (cooling), negative = warming
  const waterDeltaKm2 = sliders.waterKm2 !== null && baseline.waterKm2 !== null
    ? sliders.waterKm2 - baseline.waterKm2 : 0
  // Less water warms, more water cools — coefficient is per −1 km², so negate
  const waterBand = rangedContrib(-waterDeltaKm2, c.water.low, c.water.central, c.water.high)
  const tempFromWater = waterBand.central

  // Slider-driven subtotal (before advection multiplier)
  const sliderSubtotal = tempFromCanopy + tempFromBuiltUp + tempFromWater
  const sliderSubtotalLow = canopyBand.low + builtUpBand.low + waterBand.low
  const sliderSubtotalHigh = canopyBand.high + builtUpBand.high + waterBand.high

  // ── 2. Advection (wind direction) ────────────────────────────────────────
  // Applies as a multiplier to the slider-driven subtotal only.
  // Demonstration assumption; no verified wind-transport calibration.
  const advectionMultiplier = c.windAdvectionMultiplier[ctx.windDir]
  const tempFromAdvection = sliderSubtotal * advectionMultiplier
  // The subtotal and its advection contribution share the same coefficients.
  // Propagate their combined multiplier; independent interval addition would
  // wrongly widen the range when the advection multiplier is negative.
  const windScaledA = sliderSubtotalLow * (1 + advectionMultiplier)
  const windScaledB = sliderSubtotalHigh * (1 + advectionMultiplier)

  // ── 3. Monsoon / seasonal offset ────────────────────────────────────────
  // Relative seasonal assumption: April at the reference inputs has zero delta.
  // This avoids adding an annual-mean offset to an April-attributed anchor.
  const tempFromMonsoon = c.monsoonOffsets[ctx.month] - c.monsoonOffsets[referenceContext.month]

  // ── 4. Aerosol optical depth (AOD) forcing ───────────────────────────────
  // Assumed response relative to the city demo reference AOD, not a clean-air limit.
  const aodSteps = (ctx.aod - c.aod.referenceAod) / c.aod.stepAod
  const tempFromAerosolDay = aodSteps * c.aod.daytimeCoolingPerStep
  const tempFromAerosolNight = aodSteps * c.aod.nighttimeWarmingPerStep
  // Pick day or night aerosol forcing
  const tempFromAerosol = tod === 'day' ? tempFromAerosolDay : tempFromAerosolNight

  // ── 5. Zone offset ───────────────────────────────────────────────────────
  // Synthetic zone contrast relative to the first configured zone.
  // This is a modelling convention, not a measured geographic baseline.
  const referenceZone = city.zones[referenceContext.zone]
  const zoneConfig = city.zones[ctx.zone] ?? referenceZone
  const tempFromZone = zoneConfig.tempOffsetC - referenceZone.tempOffsetC

  // ── 6. Total temperature delta ───────────────────────────────────────────
  const fixedTempTerms = tempFromMonsoon + tempFromAerosol + tempFromZone
  const rawTempDelta = sliderSubtotal + tempFromAdvection + fixedTempTerms

  const clampT = (v: number) => Math.max(-8, Math.min(12, v))
  const tempDelta = clampT(rawTempDelta)
  const rawTempLow = Math.min(windScaledA, windScaledB) + fixedTempTerms
  const rawTempHigh = Math.max(windScaledA, windScaledB) + fixedTempTerms
  const tempDeltaLow = clampT(rawTempLow)
  const tempDeltaHigh = clampT(rawTempHigh)

  // Reference anchor plus bounded illustrative response, not a physical forecast.
  const tempC = baseline.tempC + tempDelta

  // ── 7. PM2.5 ─────────────────────────────────────────────────────────────

  // Vehicles contribution
  const vehiclesDeltaIndex = sliders.vehiclesIndex - baseline.vehiclesIndex
  const vehiclesBand = rangedContrib(
    vehiclesDeltaIndex / 10,
    c.vehicles.low,
    c.vehicles.central,
    c.vehicles.high,
  )
  const pm25FromVehicles = vehiclesBand.central

  // Advection PM2.5 offset
  const pm25FromAdvection = c.windPm25Offset[ctx.windDir] - c.windPm25Offset[referenceContext.windDir]

  // AOD contribution to PM2.5
  const pm25FromAod = aodSteps * c.aod.pm25PerStep

  const rawPm25 = baseline.pm25 + pm25FromVehicles + pm25FromAdvection + pm25FromAod
  const clampPm = (v: number) => Math.max(0, Math.min(500, v))
  // Clamp absolute PM2.5 to [0, 500]
  const pm25 = clampPm(rawPm25)
  const pm25Delta = pm25 - baseline.pm25
  const fixedPm25 = baseline.pm25 + pm25FromAdvection + pm25FromAod
  const rawPm25Low = fixedPm25 + vehiclesBand.low
  const rawPm25High = fixedPm25 + vehiclesBand.high
  const pm25DeltaLow = clampPm(rawPm25Low) - baseline.pm25
  const pm25DeltaHigh = clampPm(rawPm25High) - baseline.pm25

  // ── 8. Night cooling loss ─────────────────────────────────────────────────
  // Assumed canopy-only night-response proxy, not measured nocturnal cooling.
  const nightCoolLoss = clampT(tempFromCanopy) * c.nightCoolLossFraction
  const nightCoolLossLow = clampT(canopyBand.low) * c.nightCoolLossFraction
  const nightCoolLossHigh = clampT(canopyBand.high) * c.nightCoolLossFraction

  // ── 9. Breakdown ─────────────────────────────────────────────────────────
  const breakdown = {
    canopy: Math.round(tempFromCanopy * 100) / 100,
    builtUp: Math.round(tempFromBuiltUp * 100) / 100,
    water: Math.round(tempFromWater * 100) / 100,
    aerosolDay: tod === 'day' ? Math.round(tempFromAerosolDay * 100) / 100 : 0,
    aerosolNight: tod === 'night' ? Math.round(tempFromAerosolNight * 100) / 100 : 0,
    monsoon: Math.round(tempFromMonsoon * 100) / 100,
    advection: Math.round(tempFromAdvection * 100) / 100,
    zoneOffset: Math.round(tempFromZone * 100) / 100,
  }

  const rounded = (v: number, scale: number) => {
    const value = Math.round(v * scale) / scale
    return Object.is(value, -0) ? 0 : value
  }
  const r2 = (v: number) => rounded(v, 100)
  const r1 = (v: number) => rounded(v, 10)

  return {
    tempC: r1(tempC),
    tempDelta: r2(tempDelta),
    pm25: Math.round(pm25),
    pm25Delta: r1(pm25Delta),
    nightCoolLoss: r2(nightCoolLoss),
    breakdown,
    referenceContext,
    diagnostics: {
      temperature: {
        unclippedDelta: rawTempDelta,
        unclippedLow: rawTempLow,
        unclippedHigh: rawTempHigh,
        clipped: rawTempDelta !== tempDelta,
        sensitivityClipped: rawTempLow !== tempDeltaLow || rawTempHigh !== tempDeltaHigh,
        collapsedByClipping: rawTempLow < rawTempHigh && tempDeltaLow === tempDeltaHigh,
      },
      pm25: {
        unclippedValue: rawPm25,
        unclippedLow: rawPm25Low,
        unclippedHigh: rawPm25High,
        clipped: rawPm25 !== pm25,
        sensitivityClipped: rawPm25Low !== clampPm(rawPm25Low) || rawPm25High !== clampPm(rawPm25High),
        collapsedByClipping: rawPm25Low < rawPm25High && clampPm(rawPm25Low) === clampPm(rawPm25High),
      },
      nightCoolLoss: {
        unclippedValue: tempFromCanopy * c.nightCoolLossFraction,
        unclippedLow: canopyBand.low * c.nightCoolLossFraction,
        unclippedHigh: canopyBand.high * c.nightCoolLossFraction,
        clipped: tempFromCanopy !== clampT(tempFromCanopy),
        sensitivityClipped: canopyBand.low !== clampT(canopyBand.low) || canopyBand.high !== clampT(canopyBand.high),
        collapsedByClipping: canopyBand.low < canopyBand.high && nightCoolLossLow === nightCoolLossHigh,
      },
    },
    bands: {
      tempDelta: { low: r2(tempDeltaLow), high: r2(tempDeltaHigh) },
      pm25Delta: { low: r1(pm25DeltaLow), high: r1(pm25DeltaHigh) },
      nightCoolLoss: { low: r2(nightCoolLossLow), high: r2(nightCoolLossHigh) },
      breakdown: {
        canopy: { low: r2(canopyBand.low), high: r2(canopyBand.high) },
        builtUp: { low: r2(builtUpBand.low), high: r2(builtUpBand.high) },
        water: { low: r2(waterBand.low), high: r2(waterBand.high) },
      },
    },
  }
}
