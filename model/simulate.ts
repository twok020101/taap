import { coefficients } from './coefficients'
import { zones } from '@/data/bangalore/zones'
import type { Baseline, ModelOutput, SliderState, SimContext } from '@/cities/types'

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
 * Pure simulation function.
 *
 * Applies linear additive deltas from the coefficient table to estimate the
 * change in temperature and PM2.5 relative to the provided baseline, now
 * including monsoon seasonality, wind-direction advection, aerosol optical
 * depth forcing, and per-zone spatial offsets.
 *
 * LIMITATIONS (see /about for full panel):
 * - Linear additive only — no non-linear feedbacks
 * - Monsoon captured as monthly offset, not day-by-day dynamics
 * - Advection is a 4-cardinal-direction approximation (not mesoscale model)
 * - AOD forcing is city-average, not vertically-resolved
 * - Zone offsets are zone-mean; street-scale microclimate not captured
 * - Results are illustrative, not predictive
 *
 * @param baseline - April 2026 observed values for the city
 * @param sliders - Current slider values
 * @param ctx - Climate context (month, wind, AOD, zone, time-of-day)
 * @returns ModelOutput with absolute values, deltas, and breakdown
 */
export function simulate(
  baseline: Baseline,
  sliders: SliderState,
  ctx: SimContext = { month: 4, windDir: 'N', aod: 0.4, zone: 'central' },
): ModelOutput {
  const c = coefficients
  const tod = ctx.timeOfDay ?? 'day'

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
  const waterDeltaKm2 = sliders.waterKm2 - baseline.waterKm2
  // Less water warms, more water cools — coefficient is per −1 km², so negate
  const waterBand = rangedContrib(-waterDeltaKm2, c.water.low, c.water.central, c.water.high)
  const tempFromWater = waterBand.central

  // Slider-driven subtotal (before advection multiplier)
  const sliderSubtotal = tempFromCanopy + tempFromBuiltUp + tempFromWater
  const sliderSubtotalLow = canopyBand.low + builtUpBand.low + waterBand.low
  const sliderSubtotalHigh = canopyBand.high + builtUpBand.high + waterBand.high

  // ── 2. Advection (wind direction) ────────────────────────────────────────
  // Applies as a multiplier to the slider-driven subtotal only.
  // Source: KSPCB wind-rose 2022 + derived from zone land-use.
  const advectionMultiplier = c.windAdvectionMultiplier[ctx.windDir]
  const tempFromAdvection = sliderSubtotal * advectionMultiplier
  // Advection with a negative multiplier flips which end of the band is low vs high.
  const advA = sliderSubtotalLow * advectionMultiplier
  const advB = sliderSubtotalHigh * advectionMultiplier
  const tempFromAdvectionLow = Math.min(advA, advB)
  const tempFromAdvectionHigh = Math.max(advA, advB)

  // ── 3. Monsoon / seasonal offset ────────────────────────────────────────
  // Absolute monthly temperature modulation from IMD climatology 1991–2020.
  // This shifts the baseline, not the delta.
  const tempFromMonsoon = c.monsoonOffsets[ctx.month]

  // ── 4. Aerosol optical depth (AOD) forcing ───────────────────────────────
  // Reference is 0.4 (clean Bangalore). Steps of +0.3 AOD.
  // Source: Babu et al., ARFI 2013.
  const aodSteps = (ctx.aod - c.aod.referenceAod) / c.aod.stepAod
  const tempFromAerosolDay = aodSteps * c.aod.daytimeCoolingPerStep
  const tempFromAerosolNight = aodSteps * c.aod.nighttimeWarmingPerStep
  // Pick day or night aerosol forcing
  const tempFromAerosol = tod === 'day' ? tempFromAerosolDay : tempFromAerosolNight

  // ── 5. Zone offset ───────────────────────────────────────────────────────
  // Residual zone-specific LST not captured by the aggregate sliders.
  // Source: Ramachandra & Bharath 2023 zone-wise LULC; IISc LST maps.
  const zoneConfig = zones[ctx.zone]
  const tempFromZone = zoneConfig.tempOffsetC

  // ── 6. Total temperature delta ───────────────────────────────────────────
  const fixedTempTerms = tempFromMonsoon + tempFromAerosol + tempFromZone
  const rawTempDelta = sliderSubtotal + tempFromAdvection + fixedTempTerms

  const clampT = (v: number) => Math.max(-8, Math.min(12, v))
  const tempDelta = clampT(rawTempDelta)
  const tempDeltaLow = clampT(sliderSubtotalLow + tempFromAdvectionLow + fixedTempTerms)
  const tempDeltaHigh = clampT(sliderSubtotalHigh + tempFromAdvectionHigh + fixedTempTerms)

  // Absolute modelled temperature
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
  const pm25FromAdvection = c.windPm25Offset[ctx.windDir]

  // AOD contribution to PM2.5
  const pm25FromAod = aodSteps * c.aod.pm25PerStep

  const rawPm25 = baseline.pm25 + pm25FromVehicles + pm25FromAdvection + pm25FromAod
  const clampPm = (v: number) => Math.max(0, Math.min(500, v))
  // Clamp absolute PM2.5 to [0, 500]
  const pm25 = clampPm(rawPm25)
  const pm25Delta = pm25 - baseline.pm25
  const fixedPm25 = baseline.pm25 + pm25FromAdvection + pm25FromAod
  const pm25DeltaLow = clampPm(fixedPm25 + vehiclesBand.low) - baseline.pm25
  const pm25DeltaHigh = clampPm(fixedPm25 + vehiclesBand.high) - baseline.pm25

  // ── 8. Night cooling loss ─────────────────────────────────────────────────
  // Fraction of canopy-driven daytime warming that shows up as reduced nighttime
  // cooling (loss of evapotranspiration). Applies to canopy contribution only.
  const nightCoolLoss = clampT(tempFromCanopy) * c.nightCoolLossFraction
  const nightCoolLossLow = clampT(canopyBand.low) * c.nightCoolLossFraction
  const nightCoolLossHigh = clampT(canopyBand.high) * c.nightCoolLossFraction

  // ── 9. Breakdown ─────────────────────────────────────────────────────────
  const breakdown = {
    canopy: Math.round(tempFromCanopy * 100) / 100,
    builtUp: Math.round(tempFromBuiltUp * 100) / 100,
    water: Math.round(tempFromWater * 100) / 100,
    aerosolDay: Math.round(tempFromAerosolDay * 100) / 100,
    aerosolNight: Math.round(tempFromAerosolNight * 100) / 100,
    monsoon: Math.round(tempFromMonsoon * 100) / 100,
    advection: Math.round(tempFromAdvection * 100) / 100,
    zoneOffset: Math.round(tempFromZone * 100) / 100,
  }

  const r2 = (v: number) => Math.round(v * 100) / 100
  const r1 = (v: number) => Math.round(v * 10) / 10

  return {
    tempC: r1(tempC),
    tempDelta: r2(tempDelta),
    pm25: Math.round(pm25),
    pm25Delta: r1(pm25Delta),
    nightCoolLoss: r2(nightCoolLoss),
    breakdown,
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
