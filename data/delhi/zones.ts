/**
 * Per-zone baseline land-use and temperature offset for Delhi NCT.
 *
 * Zone definitions follow NCT administrative/geographic groupings. Canopy,
 * built-up, and water fractions are approximate zone-level disaggregations
 * of city-wide figures (ISFR 2023 13% forest cover; DU 2025 56% built-up;
 * DU 2025 30.2 km² total wetland). tempOffsetC values are engineering
 * estimates of zone-to-mean LST delta, broadly consistent with Mallick et al.
 * and Mohan et al. qualitative findings (Ridge-adjacent zones cooler,
 * Old-City and East-NCR warmer), but not quoted verbatim at zone resolution.
 *
 * Treat as illustrative, not citable at zone level. UI flags this.
 */
export const zones = {
  new_delhi: {
    label: 'New Delhi / Lutyens (low-rise, green)',
    canopyPct: 20,
    builtUpPct: 62,
    waterKm2: 1.2,
    tempOffsetC: -0.6,
  },
  south_delhi: {
    label: 'South Delhi (Saket / Hauz Khas — Ridge-adjacent)',
    canopyPct: 18,
    builtUpPct: 70,
    waterKm2: 3.5,
    tempOffsetC: -0.3,
  },
  east_delhi: {
    label: 'East Delhi (Shahdara / Yamuna floodplain)',
    canopyPct: 8,
    builtUpPct: 82,
    waterKm2: 11.0,
    tempOffsetC: 0.9,
  },
  north_delhi: {
    label: 'North Delhi (Old City / Civil Lines)',
    canopyPct: 6,
    builtUpPct: 92,
    waterKm2: 2.5,
    tempOffsetC: 1.4,
  },
  ncr_outskirts: {
    label: 'NCR Outskirts (Bahadurgarh / Faridabad fringe)',
    canopyPct: 14,
    builtUpPct: 48,
    waterKm2: 6.0,
    tempOffsetC: -1.2,
  },
} as const

export type ZoneKey = keyof typeof zones
