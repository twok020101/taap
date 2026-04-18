import type { CityConfig, LandFeature } from './types'
import { zones } from '@/data/delhi/zones'
import featuresData from '@/data/delhi/features.json'

export const delhi: CityConfig = {
  id: 'delhi',
  name: 'Delhi',
  baselineFile: 'data/delhi/baseline.json',
  presetsFile: 'data/delhi/presets.json',
  historyFile: 'data/delhi/history.json',
  /** Visual centre: Connaught Place / Central Delhi */
  mapCenter: [77.2090, 28.6315],
  mapZoom: 10.0,
  /** [west, south, east, north] covering NCT + immediate Gurgaon/Noida fringe */
  bbox: [76.84, 28.40, 77.58, 28.88],
  zoneCentroids: {
    new_delhi: [77.2090, 28.6315],
    south_delhi: [77.2280, 28.5245],
    east_delhi: [77.3100, 28.6627],
    north_delhi: [77.2070, 28.7195],
    ncr_outskirts: [77.0700, 28.6800],
  },
  zones,
  features: featuresData.features as LandFeature[],
  gadm: { iso: 'IND', adm1: 7, adm2: 1 },
  /**
   * Monsoon offsets derived from IMD Safdarjung 1991–2020 daily-mean table
   * (verbatim: 13.8, 17.4, 22.7, 28.9, 32.7, 33.3, 31.5, 30.4, 29.5, 26.2, 20.5, 15.6 °C).
   * Annual mean of the 12-month table = 25.21 °C. Offsets are month − annual mean.
   * Source quoted via Climate of Delhi, Wikipedia → IMD 1991–2020 climatological normals.
   * AOD reference bumped to 0.77 (MODIS AOD-550 Delhi climatology; flagged elevated).
   */
  coefficientOverrides: {
    monsoonOffsets: [
      0,      // index 0 unused
      -11.4,  // Jan
      -7.8,   // Feb
      -2.5,   // Mar
      +3.7,   // Apr
      +7.5,   // May
      +8.1,   // Jun
      +6.3,   // Jul
      +5.2,   // Aug
      +4.3,   // Sep
      +1.0,   // Oct
      -4.7,   // Nov
      -9.6,   // Dec
    ],
    monsoonOffsetsSource: 'IMD Safdarjung 1991–2020 via Climate of Delhi, Wikipedia',
    aod: {
      referenceAod: 0.77,
      source: 'MODIS AOD-550 Delhi climatology (Springer 2021) — flagged as peak, not clean-sky reference',
    },
  },
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
