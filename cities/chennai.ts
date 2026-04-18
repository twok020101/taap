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
  /**
   * Chennai coefficient overrides — T3 research audit (v1.1).
   *
   * Two overrides meet the strict verbatim-quote-or-inherit protocol; the
   * remaining 8 coefficients inherit Bangalore defaults with explicit
   * inheritance reasons recorded in `docs/feat-v1.1-polish.md`.
   *
   * 1. monsoonOffsets — IMD Nungambakkam 1991–2020 daily-mean temperature
   *    table. Monthly means (Jan–Dec, °C): 25.4, 26.7, 28.7, 31.0, 33.0,
   *    32.3, 31.0, 30.3, 29.8, 28.5, 26.7, 25.6. Annual mean = 29.1 °C.
   *    Offsets = month − annual mean. Note: Chennai's peak is May (pre-
   *    monsoon), NE monsoon cool-down is Oct–Dec — structurally distinct
   *    from Bangalore's Apr–May peak and Jul–Aug SW-monsoon dip.
   *    Source: Climate of Chennai, Wikipedia → IMD 1991–2020 normals;
   *    primary IMD sources https://mausam.imd.gov.in/chennai/ and
   *    https://dsp.imdpune.gov.in/home_normals.php.
   *
   * 2. aod.referenceAod = 0.43 — verbatim quote from Amanollahi et al. 2021
   *    (Arab J Geosci, DOI 10.1007/s12517-021-07455-y): "Chennai indicates
   *    mean AOD with standard deviation value of 0.43 ± 0.03". MODIS
   *    Terra+Aqua 2007–2018 combined, Collection 6, 1°×1° grid. Lower than
   *    Delhi's 0.77 but higher than Bangalore's 0.4 — matches the south-
   *    coastal background aerosol gradient.
   *
   * Known caveat (not overridden): Chennai's E/W wind-advection signs are
   * inverted vs. Bangalore's (E sea-breeze cools, W inland warms). No peer-
   * reviewed source quotes direction-specific °C multipliers, so the
   * Bangalore defaults are inherited and surfaced in the honesty panel —
   * NOT treated as Chennai-specific.
   */
  coefficientOverrides: {
    monsoonOffsets: [
      0,      // index 0 unused
      -3.7,   // Jan
      -2.4,   // Feb
      -0.4,   // Mar
      +1.9,   // Apr
      +3.9,   // May (pre-monsoon peak)
      +3.2,   // Jun
      +1.9,   // Jul
      +1.2,   // Aug
      +0.7,   // Sep
      -0.6,   // Oct (NE monsoon onset)
      -2.4,   // Nov
      -3.5,   // Dec
    ],
    monsoonOffsetsSource: 'IMD Nungambakkam 1991–2020 via Climate of Chennai, Wikipedia',
    aod: {
      referenceAod: 0.43,
      source: 'Amanollahi et al. 2021, Arab J Geosci (DOI 10.1007/s12517-021-07455-y) — MODIS Terra+Aqua 2007–2018 Chennai mean AOD',
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
