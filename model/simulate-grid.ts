/**
 * Per-cell (spatial) simulator.
 *
 * Mirrors `simulate()` but evaluates the coefficient model per grid cell,
 * weighting the three spatially-variable drivers (canopy, built-up, water)
 * by each cell's land-cover fractions. The city-mean of the resulting
 * per-cell deltas matches the city-level `simulate()` output, so nothing
 * diverges at aggregate scale — the map is the city-level result, resolved
 * in space.
 *
 * Kept deliberately branchless and allocation-free inside the hot loop
 * so a full ~15k-cell pass stays well under 20 ms on a 2020-era laptop,
 * even under fast slider dragging.
 */

import { coefficients as c } from './coefficients'
import { zones } from '@/data/bangalore/zones'
import type { Baseline, SliderState, SimContext, ZoneKey } from '@/cities/types'
import type { Grid } from './grid'

export interface GridSimResult {
  /**
   * Per-cell **spatial** delta (°C) — what the map shows.
   * Excludes the uniform monsoon + aerosol components because they carry
   * zero spatial information and would otherwise wash the entire map red
   * at baseline (April + central zone ≈ +4.2 °C everywhere). The city-level
   * `simulate()` still reports the full delta for the readouts; the map's
   * job is to show *where* heat concentrates, not city-wide seasonal drift.
   *
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
  baseline: Baseline,
  sliders: SliderState,
  ctx: SimContext,
  grid: Grid,
): GridSimResult {
  // City-level scalar deltas (same as simulate.ts, but we split by component).
  const canopyDeltaPp = sliders.canopyPct - baseline.canopyPct
  const cityCanopy = -canopyDeltaPp * c.canopy.central

  const builtUpDeltaPp = sliders.builtUpPct - baseline.builtUpPct
  const cityBuiltUp = builtUpDeltaPp * c.builtUp.central

  const waterDeltaKm2 = sliders.waterKm2 - baseline.waterKm2
  const cityWater = -waterDeltaKm2 * c.water.central

  // Note: monsoon and aerosol are deliberately omitted — see GridSimResult.
  // They shift every cell by the same amount and therefore contribute zero
  // spatial signal, while badly distorting the baseline view (April + central
  // would otherwise produce ~+4.2 °C on every cell at sliders=baseline).

  const advectionMult = c.windAdvectionMultiplier[ctx.windDir]

  // Per-cell weights — normalised so the grid-mean weight is 1, meaning
  // the grid-mean of per-cell contributions matches the city-level value.
  const invMeanCanopy = grid.meanCanopyFrac > 0 ? 1 / grid.meanCanopyFrac : 0
  const invMeanBuiltUp = grid.meanBuiltUpFrac > 0 ? 1 / grid.meanBuiltUpFrac : 0
  const invMeanWater = grid.meanWaterFrac > 0 ? 1 / grid.meanWaterFrac : 0

  // Pre-pull zone offsets once to avoid hash lookups per cell.
  const zoneOffsets: Record<ZoneKey, number> = {
    central: zones.central.tempOffsetC,
    south: zones.south.tempOffsetC,
    east: zones.east.tempOffsetC,
    north: zones.north.tempOffsetC,
    outskirts: zones.outskirts.tempOffsetC,
  }

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
