/**
 * Per-zone baseline land-use and temperature offset for Mumbai.
 *
 * Zone boundaries follow MCGM administrative wards and functional districts.
 * Canopy and built-up fractions are engineering estimates disaggregated from:
 *   - FSI ISFR 2023: 110.84 km² forest/tree cover within MCGM (18.4% overall)
 *   - Kavathekar et al. 2025 (doi:10.52939/ijg.v21i5.4163): 45.83% built-up in 2020
 *   - Individual ward/zone observations from MCGM Development Plan 2034
 *   - SGNP boundary: ~104 km² of the northern fringe
 *
 * NOTE: These are approximate zone-level disaggregations of city-wide figures.
 * They have NOT been independently verified at zone resolution and should be
 * treated as illustrative, not citable at the zone level.
 */
export const zones = {
  south_mumbai: {
    label: 'South Mumbai (Fort / Nariman Point / Colaba)',
    canopyPct: 5,
    builtUpPct: 90,
    waterKm2: 0.3,
    tempOffsetC: 1.3,
  },
  central_suburbs: {
    label: 'Central Suburbs (Dadar / Sion / Kurla / BKC)',
    canopyPct: 8,
    builtUpPct: 82,
    waterKm2: 0.8,
    tempOffsetC: 0.8,
  },
  western_suburbs: {
    label: 'Western Suburbs (Bandra / Andheri / Borivali)',
    canopyPct: 14,
    builtUpPct: 68,
    waterKm2: 1.5,
    tempOffsetC: 0.2,
  },
  eastern_suburbs: {
    label: 'Eastern Suburbs (Chembur / Govandi / Mankhurd)',
    canopyPct: 9,
    builtUpPct: 72,
    waterKm2: 2.0,
    tempOffsetC: 0.6,
  },
  sgnp_fringe: {
    label: 'SGNP Fringe (Borivali North / Mulund / Thane fringe)',
    canopyPct: 55,
    builtUpPct: 22,
    waterKm2: 5.5,
    tempOffsetC: -2.2,
  },
} as const

export type ZoneKey = keyof typeof zones
