import { coefficients } from './coefficients'
import { zones } from '@/data/bangalore/zones'
import type { Baseline, ModelOutput, SliderState, SimContext } from '@/cities/types'

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
  const tempFromCanopy = -canopyDeltaPp * c.canopy.central

  // Built-up delta: positive means more impervious surface (warming)
  const builtUpDeltaPp = sliders.builtUpPct - baseline.builtUpPct
  const tempFromBuiltUp = builtUpDeltaPp * c.builtUp.central

  // Water delta: positive means more water (cooling), negative = warming
  const waterDeltaKm2 = sliders.waterKm2 - baseline.waterKm2
  // Less water warms, more water cools — coefficient is per −1 km², so negate
  const tempFromWater = -waterDeltaKm2 * c.water.central

  // Slider-driven subtotal (before advection multiplier)
  const sliderSubtotal = tempFromCanopy + tempFromBuiltUp + tempFromWater

  // ── 2. Advection (wind direction) ────────────────────────────────────────
  // Applies as a multiplier to the slider-driven subtotal only.
  // Source: KSPCB wind-rose 2022 + derived from zone land-use.
  const advectionMultiplier = c.windAdvectionMultiplier[ctx.windDir]
  const tempFromAdvection = sliderSubtotal * advectionMultiplier

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
  const rawTempDelta =
    sliderSubtotal +
    tempFromAdvection +
    tempFromMonsoon +
    tempFromAerosol +
    tempFromZone

  // Clamp to physically plausible range (−8 to +12 as per spec)
  const tempDelta = Math.max(-8, Math.min(12, rawTempDelta))

  // Absolute modelled temperature
  const tempC = baseline.tempC + tempDelta

  // ── 7. PM2.5 ─────────────────────────────────────────────────────────────

  // Vehicles contribution
  const vehiclesDeltaIndex = sliders.vehiclesIndex - baseline.vehiclesIndex
  const pm25FromVehicles = (vehiclesDeltaIndex / 10) * c.vehicles.central

  // Advection PM2.5 offset
  const pm25FromAdvection = c.windPm25Offset[ctx.windDir]

  // AOD contribution to PM2.5
  const pm25FromAod = aodSteps * c.aod.pm25PerStep

  const rawPm25 = baseline.pm25 + pm25FromVehicles + pm25FromAdvection + pm25FromAod
  // Clamp absolute PM2.5 to [0, 500]
  const pm25 = Math.max(0, Math.min(500, rawPm25))
  const pm25Delta = pm25 - baseline.pm25

  // ── 8. Night cooling loss ─────────────────────────────────────────────────
  // Fraction of canopy-driven daytime warming that shows up as reduced nighttime
  // cooling (loss of evapotranspiration). Applies to canopy contribution only.
  const nightCoolLoss =
    Math.max(-8, Math.min(12, tempFromCanopy)) * c.nightCoolLossFraction

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

  return {
    tempC: Math.round(tempC * 10) / 10,
    tempDelta: Math.round(tempDelta * 100) / 100,
    pm25: Math.round(pm25),
    pm25Delta: Math.round(pm25Delta * 10) / 10,
    nightCoolLoss: Math.round(nightCoolLoss * 100) / 100,
    breakdown,
  }
}
