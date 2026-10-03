import bangalore from '@/data/bangalore/baseline.json'
import delhi from '@/data/delhi/baseline.json'
import mumbai from '@/data/mumbai/baseline.json'
import chennai from '@/data/chennai/baseline.json'
import { coefficients } from '@/model/coefficients'
import provenance from '@/data/evidence/baseline-provenance.json'
import type { Baseline, CityConfig, SimContext } from '@/cities/types'

const baselines: Record<string, Baseline> = { bangalore, delhi, mumbai, chennai }
export function getBaseline(cityId: string): Baseline | null {
  return Object.hasOwn(baselines, cityId) ? baselines[cityId] : null
}

/** Explicit demo origin, not a claim that the inputs were observed together. */
export function getReferenceContext(city: CityConfig): SimContext {
  return {
    month: 4,
    windDir: 'N',
    aod: city.coefficientOverrides?.aod?.referenceAod ?? coefficients.aod.referenceAod,
    zone: Object.keys(city.zones)[0] ?? 'central',
    timeOfDay: 'day',
  }
}

export interface InputProvenance {
  input: keyof Omit<Baseline, 'year'>
  label: string
  kind: 'observed' | 'estimated' | 'assumed' | 'unavailable'
  reviewStatus: 'unverified'
  period: string | null
  sourceYear: number | null
  metric: string
  footprint: string | null
  sourceTitle: string | null
  sourceUrl: string | null
  locator: string | null
  derivation: string | null
  note: string
}

export interface BaselineProvenance {
  referenceLabel: string
  referenceYear: number
  note: string
  inputs: InputProvenance[]
}

/** Metadata records repository attributions; it does not upgrade them to verified evidence. */
export function getBaselineProvenance(cityId: string): BaselineProvenance | null {
  if (!Object.hasOwn(provenance, cityId)) return null
  return provenance[cityId as keyof typeof provenance] as BaselineProvenance
}
