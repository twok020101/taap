import type { CityConfig, LandFeature } from './types'
import { zones } from '@/data/mumbai/zones'
import featuresData from '@/data/mumbai/features.json'

export const mumbai: CityConfig = {
  id: 'mumbai',
  name: 'Mumbai',
  baselineFile: 'data/mumbai/baseline.json',
  presetsFile: 'data/mumbai/presets.json',
  historyFile: 'data/mumbai/history.json',
  /** Visual centre: Bandra / mid-island */
  mapCenter: [72.8777, 19.0760],
  mapZoom: 10.4,
  /** [west, south, east, north] covering MCGM + SGNP fringe + Thane Creek */
  bbox: [72.77, 18.90, 73.05, 19.30],
  zoneCentroids: {
    south_mumbai:     [72.8180, 18.9253],
    central_suburbs:  [72.8613, 19.0593],
    western_suburbs:  [72.8370, 19.1300],
    eastern_suburbs:  [72.9200, 19.0700],
    sgnp_fringe:      [72.9163, 19.2093],
  },
  zones,
  features: featuresData.features as LandFeature[],
  /**
   * GADM v4.1 codes — verified via:
   *   1. https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_IND_2.json.zip
   *      Maharashtra = IND.20_1 (adm1=20); Mumbai City = IND.20.17_1 (adm2=17);
   *      Mumbai Suburban = IND.20.18_1 (adm2=18)
   *   2. GFW dashboard /dashboards/country/IND/20/17/ → "Mumbai City"
   *      GFW dashboard /dashboards/country/IND/20/18/ → "Mumbai Suburban"
   *
   * adm2=18 (Mumbai Suburban) used here as primary for GFW tree-loss query
   * because SGNP and Aarey fall within its boundary.
   * To get city-wide loss, query adm2 IN (17, 18) and SUM.
   */
  gadm: { iso: 'IND', adm1: 20, adm2: 18 },
  /**
   * Monsoon offsets derived from IMD Santacruz 1991–2020 monthly mean-Tmax
   * (verbatim: 31.2, 31.7, 32.7, 33.3, 34.3, 34.8, 29.4, 29.0, 30.9, 34.9, 34.5, 32.3 °C).
   * Annual mean = 32.42 °C. Offsets are month − annual mean.
   * Captures Mumbai's distinctive Jul–Aug monsoon cooling dip (−3.0/−3.4 °C)
   * and October Heat (+2.5 °C) — absent from the Bangalore profile.
   * Source quoted via Climate of Mumbai, Wikipedia → IMD 1991–2020 normals.
   */
  coefficientOverrides: {
    monsoonOffsets: [
      0,      // index 0 unused
      -1.2,   // Jan
      -0.7,   // Feb
      +0.3,   // Mar
      +0.9,   // Apr
      +1.9,   // May
      +2.4,   // Jun
      -3.0,   // Jul
      -3.4,   // Aug
      -1.5,   // Sep
      +2.5,   // Oct
      +2.1,   // Nov
      -0.1,   // Dec
    ],
    monsoonOffsetsSource: 'IMD Santacruz 1991–2020 via Climate of Mumbai, Wikipedia',
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
