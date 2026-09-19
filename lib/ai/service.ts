import 'server-only'
import { createHash } from 'node:crypto'
import { TypeSafeClient, type ChoiceQuestion, type EntryType, type SystemOneResult } from '@typesafe-ai/sdk'
import { getCity } from '@/cities'
import { getBaseline } from '@/lib/baselines'
import { applyOperations, compareScenario, operationLabel, readComparison, readContext, readSliders, type Comparison } from '@/lib/scenarios'
import { simulate } from '@/model/simulate'
import { MODEL_SCOPE, QUESTION_VERSION, claimQuestions, exploreQuestions, resolveClaim, resolveExploration } from './questions'

export const JEV_MODEL = process.env.TYPESAFE_MODEL || 'jev-1.13.0'
export class AssistantError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}
export function readAssistantRequest(body: unknown) {
  if (!body || typeof body !== 'object') throw new AssistantError('Enter a question and a valid scenario.')
  const v = body as Record<string, unknown>
  if (!['explore', 'check'].includes(v.action as string) || typeof v.text !== 'string' || !v.text.trim() || v.text.length > 1200 || typeof v.cityId !== 'string') throw new AssistantError('Use a question between 1 and 1,200 characters.')
  const city = getCity(v.cityId), baseline = getBaseline(v.cityId)
  if (!city || !baseline) throw new AssistantError('Select a supported city.')
  const sliders = readSliders(v.sliders, baseline.waterKm2 !== null)
  const ctx = readContext(v.ctx, Object.keys(city.zones))
  if (!sliders || !ctx) throw new AssistantError('The scenario contains invalid inputs. Reset it and try again.')
  let comparison: Comparison | null = null
  if (v.comparison !== undefined && v.comparison !== null) {
    comparison = readComparison(v.comparison, Object.keys(city.zones), baseline.waterKm2 !== null)
    if (!comparison) throw new AssistantError('The comparison is invalid. Create a new comparison.')
  }
  return { action: v.action as 'explore' | 'check', text: v.text.trim(), city, baseline, sliders, ctx, comparison }
}
export type AssistantRequest = ReturnType<typeof readAssistantRequest>

type QuestionMap = Record<string, ChoiceQuestion>
type Evaluation = { result: SystemOneResult<QuestionMap>; meta: { model: string; inputTokens: number; durationMs: number; cached: boolean } }
const cache = new Map<string, { until: number; evaluation: Evaluation }>()
const pending = new Map<string, Promise<Evaluation>>()
/** Bounded cache and in-flight deduplication are per process, not a global rate limit. */
export async function evaluate(state: EntryType, questions: QuestionMap): Promise<Evaluation> {
  if (!process.env.TYPESAFE_API_KEY) throw new AssistantError('Question interpretation is unavailable. You can still use the guided comparisons and sliders.', 503)
  const key = createHash('sha256').update(JSON.stringify({ version: QUESTION_VERSION, model: JEV_MODEL, state, questions })).digest('hex')
  const entry = cache.get(key)
  if (entry && entry.until > Date.now()) return { ...entry.evaluation, meta: { ...entry.evaluation.meta, inputTokens: 0, durationMs: 0, cached: true } }
  const inFlight = pending.get(key)
  if (inFlight) return inFlight
  const work = (async () => {
    const start = Date.now()
    const client = new TypeSafeClient({ defaultModel: JEV_MODEL, timeout: 12000, retry: { maxRetries: 0 }, logLevel: 'off' })
    const result = await client.systemOne({ state, questions })
    const evaluation = { result, meta: { model: result.model, inputTokens: result.usage.input_tokens, durationMs: Date.now() - start, cached: false } }
    if (cache.size >= 100) cache.delete(cache.keys().next().value!)
    cache.set(key, { until: Date.now() + 10 * 60_000, evaluation })
    return evaluation
  })()
  pending.set(key, work)
  try { return await work } finally { pending.delete(key) }
}

export function claimEvidence(request: AssistantRequest) {
  const { city, baseline, sliders, ctx, comparison } = request
  const comparisons = comparison?.scenarios.map((ops, index) => ({
    scenario: index + 1, changes: ops.map(operationLabel), startingInputs: comparison.base,
    inputs: applyOperations(comparison.base, ops), context: comparison.ctx,
    changeFromComparisonStart: compareScenario(city, baseline, comparison.base, applyOperations(comparison.base, ops), comparison.ctx),
  })) ?? []
  return {
    city: city.name, currentInputs: sliders, context: ctx,
    currentModelOutput: simulate(city, baseline, sliders, ctx),
    changeFromBaselineInputsAtSameContext: compareScenario(city, baseline, baseline, sliders, ctx),
    comparisons,
    sources: { canopy: 'model/coefficients.ts: canopy', builtUp: 'model/coefficients.ts: builtUp', water: 'model/coefficients.ts: water', vehicles: 'model/coefficients.ts: vehicles' },
    evidenceScope: 'These are outputs of the supplied implementation. They are not independent observations or verified source-paper claims.',
  }
}
export async function runAssistant(request: AssistantRequest) {
  if (request.action === 'explore') {
    const { questions, operations, explicitMode } = exploreQuestions(request.text)
    const { result, meta } = await evaluate({ request: request.text, city: request.city.name, startingInputs: { ...request.sliders }, fixedContext: { ...request.ctx }, modelScope: MODEL_SCOPE }, questions)
    return { ...resolveExploration(result.answers, operations, request.sliders, request.ctx, explicitMode), meta }
  }
  const evidence = claimEvidence(request)
  const { result, meta } = await evaluate(JSON.parse(JSON.stringify({ claim: request.text, evidence, modelScope: MODEL_SCOPE })), claimQuestions)
  return { ...resolveClaim(result.answers), evidence, meta }
}
export type AssistantResponse = Awaited<ReturnType<typeof runAssistant>>
