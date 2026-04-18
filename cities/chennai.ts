import type { CityConfig, LandFeature } from './types'
import { zones } from '@/data/chennai/zones'
import featuresData from '@/data/chennai/features.json'

export const chennai: CityConfig = {
  id: 'chennai',
  name: 'Chennai',
  baselineFile: 'data/chennai/baseline.json',
  presetsFile: 'data/chennai/presets.json',
  historyFile: 'data/chennai/history.json',
  /** Visual centre: Nungambakkam / Central Chennai */
  mapCenter: [80.2338, 13.0524],
  mapZoom: 10.4,
  /** [west, south, east, north] covering GCC + inner CMA fringe */
  bbox: [80.05, 12.82, 80.33, 13.22],
  zoneCentroids: {
    central:          [80.2788, 13.0827],
    north_chennai:    [80.2920, 13.1500],
    south_chennai:    [80.2350, 12.9650],
    omr_it_corridor:  [80.2340, 12.8700],
    western_fringe:   [80.1400, 13.0700],
  },
  zones,
  features: featuresData.features as LandFeature[],
  gadm: { iso: 'IND', adm1: 31, adm2: 2 },
  mapStyleUrl: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
  mapBasemaps: {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
    satellite: {
      type: 'raster-xyz' as const,
      tileUrl: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
      attribution: 'Sentinel-2 cloudless 2024 · EOX IT Services — modified Copernicus Sentinel data',
      maxZoom: 15,
    },
  },
}
