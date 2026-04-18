export interface SliderState {
  canopyPct: number
  builtUpPct: number
  waterKm2: number
  vehiclesIndex: number
  populationM: number
}

export interface Baseline extends SliderState {
  tempC: number
  pm25: number
  year: number
}

export type Preset = Baseline

export interface BreakdownComponents {
  canopy: number
  builtUp: number
  water: number
  aerosolDay: number
  aerosolNight: number
  monsoon: number
  advection: number
  zoneOffset: number
}

/** Per-component low/high bounds on the temperature breakdown. */
export interface BreakdownBands {
  canopy: { low: number; high: number }
  builtUp: { low: number; high: number }
  water: { low: number; high: number }
}

export interface ModelBand {
  low: number
  high: number
}

export interface ModelOutput {
  tempC: number
  tempDelta: number
  pm25: number
  pm25Delta: number
  nightCoolLoss: number
  breakdown: BreakdownComponents
  /**
   * Low/high bounds on each ranged readout, propagated from the coefficient
   * `{low, high}` intervals. Fixed-value components (monsoon, aerosol, wind
   * direction, zone) pass through identically on both bounds.
   */
  bands: {
    tempDelta: ModelBand
    pm25Delta: ModelBand
    nightCoolLoss: ModelBand
    breakdown: BreakdownBands
  }
}

export interface StatEntry {
  label: string
  value: number
  suffix: string
  source: string
}

export interface HistoryData {
  stats: StatEntry[]
}

export type PresetYear = '1973' | '2000' | '2024' | '2026'

/** Generic zone key — any string. Per-city zone sets are heterogeneous. */
export type ZoneKey = string

export interface ZoneInfo {
  label: string
  canopyPct: number
  builtUpPct: number
  waterKm2: number
  tempOffsetC: number
}

export interface LandFeature {
  type: 'water' | 'green' | 'builtup'
  name: string
  center: [number, number]
  radius_m: number
  strength: number
}

export interface CityConfig {
  id: string
  name: string
  baselineFile: string
  presetsFile: string
  historyFile: string
  /** [lng, lat] of the city's visual centre */
  mapCenter: [number, number]
  mapZoom: number
  /** [west, south, east, north] in lng/lat */
  bbox: [number, number, number, number]
  /** Approximate centroids of each zone, used for nearest-centroid grid-cell assignment */
  zoneCentroids: Record<ZoneKey, [number, number]>
  /** Zone definitions (label + land-use + LST offset) per city. */
  zones: Record<ZoneKey, ZoneInfo>
  /** Curated land-cover features (lakes, parks, dense corridors) driving the heatmap grid. */
  features: LandFeature[]
  /** GADM v4.1 identifiers for GFW tree-cover-loss queries. */
  gadm?: { iso: string; adm1: number; adm2: number }
  /**
   * Per-city coefficient overrides that take precedence over the default
   * Bangalore-calibrated `coefficients` table. Only override fields where a
   * city-specific peer-reviewed source exists; leave others unset to inherit.
   * `monsoonOffsetsSource` is a human label for UI attribution (e.g.
   * "IMD Safdarjung 1991–2020 via Climate of Delhi, Wikipedia").
   */
  coefficientOverrides?: {
    monsoonOffsets?: readonly number[]
    monsoonOffsetsSource?: string
    aod?: { referenceAod?: number; source?: string }
    windAdvectionMultiplier?: Partial<Record<'N' | 'E' | 'S' | 'W', number>>
    windPm25Offset?: Partial<Record<'N' | 'E' | 'S' | 'W', number>>
  }
  /** MapLibre style URL for the basemap (prefer free / no-key providers) */
  mapStyleUrl: string
  /** Optional structured basemap definitions for toggle UI */
  mapBasemaps?: {
    dark: string
    satellite: {
      type: 'raster-xyz'
      tileUrl: string
      attribution: string
      maxZoom: number
    }
  }
}

export type WindDir = 'N' | 'E' | 'S' | 'W'

export interface SimContext {
  month: number         // 1-12
  windDir: WindDir
  aod: number           // 0.1-1.0
  zone: ZoneKey
  timeOfDay?: 'day' | 'night'  // default 'day'
}
