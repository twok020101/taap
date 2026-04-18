import type { CityConfig } from './types'

export const bangalore: CityConfig = {
  id: 'bangalore',
  name: 'Bangalore',
  baselineFile: 'data/bangalore/baseline.json',
  presetsFile: 'data/bangalore/presets.json',
  historyFile: 'data/bangalore/history.json',
  // Bangalore city centre: Majestic area
  mapCenter: [77.5946, 12.9716],
  mapZoom: 11,
  // [west, south, east, north]
  bbox: [77.35, 12.75, 77.85, 13.15],
}
