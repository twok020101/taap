/**
 * Coefficients for the Bangalore Urban Heat Model.
 *
 * Each driver has central / low / high estimates derived from peer-reviewed
 * literature. All values are per-unit change in the driver relative to the
 * April 2026 baseline.
 *
 * IMPORTANT: This is an illustrative model, not a forecast. Linear additive
 * deltas cannot capture non-linear feedbacks, spatial heterogeneity, monsoon
 * dynamics, or advection. See /about for the full honesty panel.
 */

export interface Coefficient {
  /** Effect per unit change in driver (see unit in description) */
  central: number
  low: number
  high: number
  unit: string
  description: string
  source: string
}

export const coefficients = {
  /**
   * Tree canopy cover.
   * Per −1 percentage-point reduction in canopy: +°C daytime LST.
   * Sources: Ziter et al. 2019 (PNAS); Manoli et al. 2024 (Nature Comms).
   * Range 0.06–0.12 °C / −1 pp canopy.
   */
  canopy: {
    central: 0.09,
    low: 0.06,
    high: 0.12,
    unit: '°C per −1 pp canopy',
    description: 'Daytime LST increase per 1 percentage-point loss of tree canopy cover',
    source: 'Ziter et al. 2019, PNAS; Manoli et al. 2024, Nature Communications',
  } satisfies Coefficient,

  /**
   * Built-up / impervious surface.
   * Per +1 percentage-point increase in built-up area: +°C LST.
   * Source: IISc Bangalore 1973–2023 decadal study (Ramachandra & Bharath 2023).
   * Range 0.05–0.10 °C / +1 pp built-up.
   */
  builtUp: {
    central: 0.075,
    low: 0.05,
    high: 0.10,
    unit: '°C per +1 pp built-up',
    description: 'LST increase per 1 percentage-point increase in impervious surface',
    source: 'IISc Ramachandra & Bharath 2023, Sustainable Cities and Society',
  } satisfies Coefficient,

  /**
   * Water bodies (lakes, tanks, wetlands).
   * Per −1 km² reduction in water area within 500 m buffer: +°C LST.
   * Source: Sustainable Cities & Society 2024 meta-analysis.
   * Range 0.3–0.8 °C / −1 km².
   */
  water: {
    central: 0.55,
    low: 0.30,
    high: 0.80,
    unit: '°C per −1 km² water',
    description: 'LST increase per 1 km² loss of water body within 500 m buffer',
    source: 'Sustainable Cities and Society 2024 (meta-analysis of urban water cooling)',
  } satisfies Coefficient,

  /**
   * Vehicle fleet index.
   * Per +10 percentage-point increase in vehicles index: +µg/m³ PM2.5.
   * Sources: KSPCB emission inventory; UrbanEmissions APnA 2018 model.
   * Range 3–5 µg/m³ per +10 pp index.
   * NOTE: No direct temperature effect — PM2.5 warming via aerosol forcing
   * is modelled separately via the AOD slider.
   */
  vehicles: {
    central: 4,
    low: 3,
    high: 5,
    unit: 'µg/m³ PM2.5 per +10 pp vehicle index',
    description: 'PM2.5 increase per 10 percentage-point increase in vehicle fleet index',
    source: 'KSPCB emission inventory; UrbanEmissions APnA 2018',
  } satisfies Coefficient,

  /**
   * Night cooling loss multiplier.
   * Fraction of daytime canopy-driven warming that also manifests as reduced
   * nighttime cooling (loss of evapotranspiration). Applies to canopy delta only.
   * Value: 0.3 (30% of day delta).
   * Source: PNAS 2019 Ziter — night/day ratio for urban forest cooling.
   */
  nightCoolLossFraction: 0.30,

  /**
   * Monsoon / seasonal baseline offsets (°C from annual mean 24°C).
   * Indexed by month 1–12.
   * Source: IMD climatology Bangalore 1991–2020.
   */
  monsoonOffsets: [
    0,      // index 0 unused (months are 1-based)
    -2.0,   // Jan
    -1.0,   // Feb
    +1.5,   // Mar
    +3.0,   // Apr
    +3.5,   // May
    +1.0,   // Jun (monsoon starts)
    -0.5,   // Jul (peak monsoon)
    -0.5,   // Aug
    +0.5,   // Sep
    +1.0,   // Oct
    -0.5,   // Nov
    -1.5,   // Dec
  ] as const,

  /**
   * Wind direction advection multipliers.
   * Applied as a multiplier to the slider-driven temperature delta
   * (canopy + builtUp + water sum only, pre-advection).
   *
   * Source: KSPCB wind-rose 2022 + derived from zone land-use.
   */
  windAdvectionMultiplier: {
    N: 0.05,   // Airport / mixed — slight warming
    E: 0.15,   // Whitefield / IT corridor — hotter urban wind
    S: 0.10,   // Electronic City / built-up — moderate warming
    W: -0.20,  // Mysuru road / green belt — cooler rural wind
  } as const,

  /**
   * Wind advection PM2.5 offset by direction (µg/m³).
   * Source: KSPCB wind-rose 2022 + zone land-use analysis.
   */
  windPm25Offset: {
    N: 0,   // mixed — neutral
    E: 8,   // IT corridor traffic load
    S: 4,   // Electronic City traffic
    W: -5,  // green belt — cleaner air
  } as const,

  /**
   * Aerosol Optical Depth (AOD) forcing.
   * Reference AOD: 0.4 (clean Bangalore). Effects per +0.3 AOD above reference.
   * - Daytime cooling: −0.8°C per +0.3 AOD (solar dimming)
   * - Nighttime warming: +0.5°C per +0.3 AOD (IR trapping)
   * - PM2.5 increase: +30 µg/m³ per +0.3 AOD
   *
   * Source: Babu et al., ARFI 2013 — Bangalore AOD-forcing.
   */
  aod: {
    referenceAod: 0.4,
    stepAod: 0.3,
    daytimeCoolingPerStep: -0.8,   // °C per +0.3 AOD
    nighttimeWarmingPerStep: 0.5,  // °C per +0.3 AOD
    pm25PerStep: 30,               // µg/m³ per +0.3 AOD
  } as const,
} as const
