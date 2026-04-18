/**
 * Per-zone baseline land-use and temperature offset for Bangalore.
 *
 * Source: Ramachandra & Bharath 2023 zone-wise LULC; IISc LST maps.
 */
export const zones = {
  central: {
    label: 'Central (Majestic/CBD)',
    canopyPct: 4,
    builtUpPct: 97,
    waterKm2: 0.2,
    tempOffsetC: 1.2,
  },
  south: {
    label: 'South (Jayanagar/BTM)',
    canopyPct: 12,
    builtUpPct: 85,
    waterKm2: 1.1,
    tempOffsetC: 0.2,
  },
  east: {
    label: 'East (Whitefield/Marathahalli)',
    canopyPct: 5,
    builtUpPct: 93,
    waterKm2: 0.6,
    tempOffsetC: 0.9,
  },
  north: {
    label: 'North (Hebbal/Yelahanka)',
    canopyPct: 9,
    builtUpPct: 82,
    waterKm2: 2.4,
    tempOffsetC: -0.3,
  },
  outskirts: {
    label: 'Outskirts (Nelamangala etc.)',
    canopyPct: 28,
    builtUpPct: 48,
    waterKm2: 3.8,
    tempOffsetC: -1.8,
  },
} as const

export type ZoneKey = keyof typeof zones
