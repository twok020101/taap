/**
 * Per-zone baseline land-use and temperature offset for Chennai.
 *
 * Zone boundaries follow GCC ward-cluster groupings and CMA revenue districts.
 * Canopy and built-up fractions are engineering estimates derived from:
 *   - FSI ISFR 2023: GCC-wide 4.66% forest/tree cover
 *   - MDPI Entropy 2017 (doi:10.3390/e19070358): 70.35% built-up across CMA in 2016
 *   - Remote-sensing studies (Ramachandran et al. 2021, Environmental Challenges)
 *   - Water body areas from individual Wikipedia entries and CPCB/TWAD data
 *
 * NOTE: These are approximate zone-level disaggregations of city-wide figures.
 * They have NOT been independently verified at zone resolution and should be
 * treated as illustrative, not citable at the zone level.
 */
export const zones = {
  central: {
    label: 'Central Chennai (George Town / Egmore)',
    canopyPct: 2,
    builtUpPct: 96,
    waterKm2: 0.2,
    tempOffsetC: 1.5,
  },
  north_chennai: {
    label: 'North Chennai (Manali / Tondiarpet)',
    canopyPct: 2,
    builtUpPct: 90,
    waterKm2: 1.0,
    tempOffsetC: 1.2,
  },
  south_chennai: {
    label: 'South Chennai (Adyar / Pallikaranai)',
    canopyPct: 8,
    builtUpPct: 72,
    waterKm2: 8.0,
    tempOffsetC: -0.5,
  },
  omr_it_corridor: {
    label: 'OMR IT Corridor (Sholinganallur / Siruseri)',
    canopyPct: 5,
    builtUpPct: 80,
    waterKm2: 1.5,
    tempOffsetC: 0.4,
  },
  western_fringe: {
    label: 'Western Fringe (Porur / Ambattur / Chembarambakkam)',
    canopyPct: 7,
    builtUpPct: 65,
    waterKm2: 18.0,
    tempOffsetC: -0.8,
  },
} as const

export type ZoneKey = keyof typeof zones
