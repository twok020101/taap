/**
 * Synthetic spatial response pattern, not measured street-level temperature.
 * Uses assumed zone land cover and curated feature weights. Uniform month/AOD
 * terms are omitted; cell relief and zone contrasts are added and each cell is
 * independently clipped. Consequently its grid mean need not equal simulate().
 */

import { coefficients as c } from './coefficients'
import { getReferenceContext } from '@/lib/baselines'
import type { Baseline, CityConfig, SliderState, SimContext, ZoneKey } from '@/cities/types'
import type { Grid } from './grid'

export interface GridSimResult {
  /**
   * Illustrative per-cell temperature-equivalent pattern relative to the city
   * reference zone. Includes synthetic relief even at unchanged sliders; this
   * is not a measured reference surface. Omits uniform month/AOD components.
   * Length = grid.cells.length.
   */
  tempDelta: Float32Array
  /** Mean of tempDelta across all cells. */
  cityMeanTempDelta: number
  /** Min / max for legend auto-ranging. */
  minDelta: number
  maxDelta: number
}

export function simulateGrid(
  city: CityConfig,
  baseline: Baseline,
  sliders: SliderState,
  ctx: SimContext,
  grid: Grid,
): GridSimResult {
  // Per-city wind advection multiplier override merged onto defaults.
  const advMult =
    city.coefficientOverrides?.windAdvectionMultiplier?.[ctx.windDir] ??
    c.windAdvectionMultiplier[ctx.windDir]

  // City-level scalar deltas (same as simulate.ts, but we split by component).
  const canopyDeltaPp = sliders.canopyPct - baseline.canopyPct
  const cityCanopy = -canopyDeltaPp * c.canopy.central

  const builtUpDeltaPp = sliders.builtUpPct - baseline.builtUpPct
  const cityBuiltUp = builtUpDeltaPp * c.builtUp.central

  const waterDeltaKm2 = sliders.waterKm2 !== null && baseline.waterKm2 !== null
    ? sliders.waterKm2 - baseline.waterKm2 : 0
  const cityWater = -waterDeltaKm2 * c.water.central

  // Uniform month/AOD terms are omitted; the overlay depicts only a
  // synthetic spatial pattern and must not be interpreted as headline values.

  const advectionMult = advMult

  // Per-cell weights — normalised so the grid-mean weight is 1, meaning
  // the grid-mean of per-cell contributions matches the city-level value.
  const invMeanCanopy = grid.meanCanopyFrac > 0 ? 1 / grid.meanCanopyFrac : 0
  const invMeanBuiltUp = grid.meanBuiltUpFrac > 0 ? 1 / grid.meanBuiltUpFrac : 0
  const invMeanWater = grid.meanWaterFrac > 0 ? 1 / grid.meanWaterFrac : 0

  // Same reference-zone origin as the headline, plus synthetic cell relief.
  const referenceZoneOffset = city.zones[getReferenceContext(city).zone].tempOffsetC
  const zoneOffsets: Record<ZoneKey, number> = Object.fromEntries(
    Object.entries(city.zones).map(([k, z]) => [k, z.tempOffsetC - referenceZoneOffset]),
  )

  const cells = grid.cells
  const n = cells.length
  const out = new Float32Array(n)

  let sum = 0
  let min = Infinity
  let max = -Infinity

  for (let i = 0; i < n; i++) {
    const cell = cells[i]

    const wCanopy = cell.canopyFrac * invMeanCanopy
    const wBuiltUp = cell.builtUpFrac * invMeanBuiltUp
    const wWater = cell.waterFrac * invMeanWater

    const cellCanopy = cityCanopy * wCanopy
    const cellBuiltUp = cityBuiltUp * wBuiltUp
    const cellWater = cityWater * wWater

    const sliderSub = cellCanopy + cellBuiltUp + cellWater
    const advection = sliderSub * advectionMult
    const zoneOffset = zoneOffsets[cell.zone]

    let delta = sliderSub + advection + zoneOffset + cell.reliefC
    if (delta < -8) delta = -8
    else if (delta > 12) delta = 12

    out[i] = delta
    sum += delta
    if (delta < min) min = delta
    if (delta > max) max = delta
  }

  return {
    tempDelta: out,
    cityMeanTempDelta: n > 0 ? sum / n : 0,
    minDelta: min,
    maxDelta: max,
  }
}
