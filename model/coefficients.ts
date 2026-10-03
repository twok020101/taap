/**
 * Demonstration assumptions for Taap's deterministic response model.
 *
 * These values and low/high ranges have no verified numerical derivation or
 * Indian-city calibration. They produce an illustrative temperature-equivalent
 * response, not an air-temperature or land-surface-temperature (LST) forecast.
 * Literature describes mechanisms; a citation does not validate a coefficient.
 * Values are applied relative to mixed-year reference inputs and the explicitly
 * defined reference context in lib/baselines.ts. See each city's /about page.
 */
export interface Coefficient {
  central: number
  low: number
  high: number
  unit: string
  description: string
  source: string
  evidenceStatus: 'assumed'
}

export const coefficients = {
  /**
   * Demonstration slope and selected sensitivity range, not a fitted estimate.
   * Mechanism context only: Ziter et al. (2019), doi:10.1073/pnas.1817561116,
   * measured AIR temperature and nonlinear, scale-dependent canopy effects in
   * Madison, Wisconsin. It does not establish this linear coefficient or range.
   */
  canopy: {
    central: 0.09,
    low: 0.06,
    high: 0.12,
    unit: '°C-equivalent per −1 pp canopy',
    description: 'Assumed temperature-equivalent increase per 1 percentage-point loss of tree canopy',
    source: 'Demonstration assumption; Ziter et al. 2019 (air temperature) supports mechanism only, not this coefficient',
    evidenceStatus: 'assumed',
  } satisfies Coefficient,
  /** No verified source derivation for this demonstration slope or range. */
  builtUp: {
    central: 0.075,
    low: 0.05,
    high: 0.10,
    unit: '°C-equivalent per +1 pp built-up',
    description: 'Assumed temperature-equivalent increase per 1 percentage-point increase in built-up area',
    source: 'Demonstration assumption; numerical source derivation unverified',
    evidenceStatus: 'assumed',
  } satisfies Coefficient,
  /** No verified city-wide water-area scaling or 500 m effect is established. */
  water: {
    central: 0.55,
    low: 0.30,
    high: 0.80,
    unit: '°C-equivalent per −1 km² water',
    description: 'Assumed temperature-equivalent increase per 1 km² loss of water area',
    source: 'Demonstration assumption; numerical source derivation and spatial applicability unverified',
    evidenceStatus: 'assumed',
  } satisfies Coefficient,
  /** Index POINTS, not percentage points. No direct thermal effect. */
  vehicles: {
    central: 4,
    low: 3,
    high: 5,
    unit: 'µg/m³-equivalent PM2.5 per +10 vehicle index points',
    description: 'Assumed PM2.5-equivalent increase per 10 vehicle fleet index points',
    source: 'Demonstration assumption; emissions-to-concentration derivation unverified',
    evidenceStatus: 'assumed',
  } satisfies Coefficient,

  /** Assumed multiplier on canopy response, not a verified night/day ratio. */
  nightCoolLossFraction: 0.30,

  /**
   * Assumed seasonal profile, months 1–12. The simulator SUBTRACTS the April
   * entry, so April contributes zero. Prior IMD attribution has no verified
   * table locator/derivation here; city overrides also remain unverified.
   */
  monsoonOffsets: [0, -2, -1, 1.5, 3, 3.5, 1, -0.5, -0.5, 0.5, 1, -0.5, -1.5] as const,

  /** Assumed multipliers on land-use response; not calibrated wind transport. */
  windAdvectionMultiplier: { N: 0.05, E: 0.15, S: 0.10, W: -0.20 } as const,

  /** Assumed PM2.5-equivalent offsets; N is the reference direction. */
  windPm25Offset: { N: 0, E: 8, S: 4, W: -5 } as const,

  /**
   * Assumed aerosol response slopes and step size; not verified radiative
   * forcing or a validated conversion between AOD and ground-level PM2.5.
   * City-specific reference AOD values set the demo origin, not clean-air limits.
   */
  aod: {
    referenceAod: 0.4,
    stepAod: 0.3,
    daytimeCoolingPerStep: -0.8,
    nighttimeWarmingPerStep: 0.5,
    pm25PerStep: 30,
  } as const,
} as const
