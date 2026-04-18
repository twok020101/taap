import type { zones } from '@/data/bangalore/zones'

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

export interface ModelOutput {
  tempC: number
  tempDelta: number
  pm25: number
  pm25Delta: number
  nightCoolLoss: number
  breakdown: BreakdownComponents
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

export interface CityConfig {
  id: string
  name: string
  baselineFile: string
  presetsFile: string
  historyFile: string
  mapCenter: [number, number]
  mapZoom: number
  bbox: [number, number, number, number]
}

export type WindDir = 'N' | 'E' | 'S' | 'W'

// ZoneKey derived from the zones data object
export type ZoneKey = keyof typeof zones

export interface SimContext {
  month: number         // 1-12
  windDir: WindDir
  aod: number           // 0.1-1.0
  zone: ZoneKey
  timeOfDay?: 'day' | 'night'  // default 'day'
}
