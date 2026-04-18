import type { CityConfig, LandFeature } from './types'
import { zones } from '@/data/bangalore/zones'
import featuresData from '@/data/bangalore/features.json'

export const bangalore: CityConfig = {
  id: 'bangalore',
  name: 'Bangalore',
  baselineFile: 'data/bangalore/baseline.json',
  presetsFile: 'data/bangalore/presets.json',
  historyFile: 'data/bangalore/history.json',
  mapCenter: [77.5946, 12.9716],
  mapZoom: 10.4,
  bbox: [77.35, 12.75, 77.85, 13.15],
  zoneCentroids: {
    central: [77.5946, 12.9716],
    south: [77.5890, 12.9165],
    east: [77.7499, 12.9698],
    north: [77.5920, 13.0850],
    outskirts: [77.4500, 13.1050],
  },
  zones,
  features: featuresData.features as LandFeature[],
  gadm: { iso: 'IND', adm1: 17, adm2: 5 },
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
