/**
 * Land-cover grid for the spatial heatmap.
 *
 * Generates a ~400 m regular grid over the city bbox and populates each cell
 * with canopy / built-up / water fractions by combining two layers:
 *
 *   1. Zone baseline — nearest zone centroid sets the cell's starting
 *      canopy/built-up fractions from `zones.ts` (IISc LULC 2023).
 *   2. Feature overlay — each curated feature in `features.json` (lakes,
 *      parks, CBD, forest edges) contributes via a smooth cosine-bell
 *      falloff, so a cell near a lake gets mostly water, a cell deep in
 *      Cubbon Park gets mostly canopy, etc.
 *
 * The output is deterministic and generated on first access. Water, canopy,
 * and built-up fractions sum to ≤ 1 per cell (the remainder is "other" —
 * bare ground, sparse vegetation, roads).
 */

import type { CityConfig, ZoneKey } from '@/cities/types'
import { zones } from '@/data/bangalore/zones'
import { coefficients as c } from './coefficients'
import featuresData from '@/data/bangalore/features.json'

/** Target cell size in metres — balances resolution vs MapLibre feature count. */
const CELL_SIZE_M = 400

const M_PER_DEG_LAT = 110_540
const mPerDegLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180)

export interface LandFeature {
  type: 'water' | 'green' | 'builtup'
  name: string
  center: [number, number]
  radius_m: number
  strength: number
}

export interface Cell {
  /** Cell centre [lng, lat] */
  lng: number
  lat: number
  canopyFrac: number
  builtUpFrac: number
  waterFrac: number
  zone: ZoneKey
  /**
   * Static baseline relief (°C) vs the cell's zone mean, derived from how
   * much this cell's land cover deviates from its zone's average. Parks and
   * lakes read as cooler than their surroundings even when the sliders
   * haven't moved; dense micro-clusters read warmer. Added to the model's
   * dynamic tempDelta in simulateGrid().
   */
  reliefC: number
}

export interface Grid {
  bbox: [number, number, number, number]
  cols: number
  rows: number
  cellSizeDegLng: number
  cellSizeDegLat: number
  cells: Cell[]
  /** Mean fractions across the grid, used to scale slider deltas per-cell. */
  meanCanopyFrac: number
  meanBuiltUpFrac: number
  meanWaterFrac: number
}

/** Cosine-bell falloff: 1 at x=0, 0 at x>=1, smooth in between. */
function bell(x: number): number {
  if (x >= 1) return 0
  return 0.5 + 0.5 * Math.cos(Math.PI * x)
}

/** Distance in metres between two lng/lat points (small-angle approximation). */
function distM(a: [number, number], b: [number, number]): number {
  const meanLat = (a[1] + b[1]) / 2
  const dx = (a[0] - b[0]) * mPerDegLng(meanLat)
  const dy = (a[1] - b[1]) * M_PER_DEG_LAT
  return Math.sqrt(dx * dx + dy * dy)
}

function nearestZone(
  cell: [number, number],
  centroids: Record<string, [number, number]>,
): ZoneKey {
  let best: ZoneKey = 'central'
  let bestDist = Infinity
  for (const [key, c] of Object.entries(centroids)) {
    const d = distM(cell, c)
    if (d < bestDist) {
      bestDist = d
      best = key as ZoneKey
    }
  }
  return best
}

let cache: { cityId: string; grid: Grid } | null = null

export function buildGrid(city: CityConfig): Grid {
  if (cache && cache.cityId === city.id) return cache.grid

  const [west, south, east, north] = city.bbox
  const centreLat = (south + north) / 2

  const cellSizeDegLng = CELL_SIZE_M / mPerDegLng(centreLat)
  const cellSizeDegLat = CELL_SIZE_M / M_PER_DEG_LAT

  const cols = Math.ceil((east - west) / cellSizeDegLng)
  const rows = Math.ceil((north - south) / cellSizeDegLat)

  const features = featuresData.features as LandFeature[]
  const waterFeats = features.filter(f => f.type === 'water')
  const greenFeats = features.filter(f => f.type === 'green')
  const builtFeats = features.filter(f => f.type === 'builtup')

  const cells: Cell[] = new Array(cols * rows)

  let sumC = 0
  let sumB = 0
  let sumW = 0

  for (let r = 0; r < rows; r++) {
    const lat = south + (r + 0.5) * cellSizeDegLat
    for (let col = 0; col < cols; col++) {
      const lng = west + (col + 0.5) * cellSizeDegLng
      const cellCentre: [number, number] = [lng, lat]

      const zone = nearestZone(cellCentre, city.zoneCentroids)
      const z = zones[zone]

      let canopy = z.canopyPct / 100
      let builtUp = z.builtUpPct / 100

      let waterBoost = 0
      for (const f of waterFeats) {
        const d = distM(cellCentre, f.center)
        waterBoost += f.strength * bell(d / f.radius_m)
      }
      let greenBoost = 0
      for (const f of greenFeats) {
        const d = distM(cellCentre, f.center)
        greenBoost += f.strength * bell(d / f.radius_m)
      }
      let builtBoost = 0
      for (const f of builtFeats) {
        const d = distM(cellCentre, f.center)
        builtBoost += f.strength * bell(d / f.radius_m)
      }

      // Water dominates where present.
      const waterFrac = Math.min(1, waterBoost)
      const remaining = 1 - waterFrac

      // Green pulls canopy up and built-up down; built-up does the reverse.
      canopy = canopy + greenBoost * 0.9 - builtBoost * 0.25
      builtUp = builtUp + builtBoost * 0.6 - greenBoost * 0.5

      canopy = Math.max(0, Math.min(1, canopy))
      builtUp = Math.max(0, Math.min(1, builtUp))

      // Renormalise within the non-water remainder.
      const sum = canopy + builtUp
      let canopyFrac: number
      let builtUpFrac: number
      if (sum > remaining && sum > 0) {
        const scale = remaining / sum
        canopyFrac = canopy * scale
        builtUpFrac = builtUp * scale
      } else {
        canopyFrac = canopy
        builtUpFrac = builtUp
      }

      sumC += canopyFrac
      sumB += builtUpFrac
      sumW += waterFrac

      // Relief: how different is this cell from its zone's mean land cover?
      // Applies the same coefficients as simulate.ts but to the *static* deviation
      // from zone baseline, so features are visible at sliders=baseline.
      const cellCanopyPp = canopyFrac * 100
      const cellBuiltUpPp = builtUpFrac * 100
      const canopyDev = cellCanopyPp - z.canopyPct
      const builtUpDev = cellBuiltUpPp - z.builtUpPct
      // Water coefficient is °C per −1 km² within 500 m buffer; approximate the
      // cell's "effective water exposure" as waterFrac * typical-500 m-buffer-area (0.8 km²).
      const waterDevKm2 = waterFrac * 0.8
      const reliefC =
        -c.canopy.central * canopyDev +
        c.builtUp.central * builtUpDev +
        -c.water.central * waterDevKm2

      cells[r * cols + col] = {
        lng,
        lat,
        canopyFrac,
        builtUpFrac,
        waterFrac,
        zone,
        reliefC,
      }
    }
  }

  const n = cells.length
  const grid: Grid = {
    bbox: city.bbox,
    cols,
    rows,
    cellSizeDegLng,
    cellSizeDegLat,
    cells,
    meanCanopyFrac: sumC / n,
    meanBuiltUpFrac: sumB / n,
    meanWaterFrac: sumW / n,
  }

  cache = { cityId: city.id, grid }
  return grid
}

/** GeoJSON square polygon for a cell, as a ring of [lng, lat] pairs. */
export function cellPolygon(
  cell: Cell,
  cellSizeDegLng: number,
  cellSizeDegLat: number,
): [number, number][][] {
  const halfLng = cellSizeDegLng / 2
  const halfLat = cellSizeDegLat / 2
  const { lng, lat } = cell
  return [
    [
      [lng - halfLng, lat - halfLat],
      [lng + halfLng, lat - halfLat],
      [lng + halfLng, lat + halfLat],
      [lng - halfLng, lat + halfLat],
      [lng - halfLng, lat - halfLat],
    ],
  ]
}
