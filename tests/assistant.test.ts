import test from 'node:test'
import assert from 'node:assert/strict'
import { exploreQuestions, resolveExploration, resolveClaim, type Answers } from '../lib/ai/questions'
import { getBaseline } from '../lib/baselines'
import { quotePresent, resolveEvidence } from '../lib/ai/evidence'
import { readAssistantRequest } from '../lib/ai/service'
import { POST } from '../app/api/assistant/route'
import type { SimContext } from '../cities/types'

const baseline = getBaseline('bangalore')!
const ctx: SimContext = { month: 4, windDir: 'N', aod: 0.4, zone: 'central', timeOfDay: 'day' }
const answer = (choice: string, confidence = 0.99) => ({ type: 'choice' as const, choice, confidence, probabilities: { [choice]: 1 } })
const defaults: Answers = { scope: answer('supported'), goal: answer('both'), mode: answer('compare'), canopyPct: answer('more_default'), builtUpPct: answer('hold'), waterKm2: answer('unspecified'), vehiclesIndex: answer('less_default') }
test('resolver preserves a held built-up constraint and exposes default amounts', () => {
  const q = exploreQuestions('Compare more trees with fewer vehicles, keep built-up fixed')
  const r = resolveExploration(defaults, q.operations, baseline, ctx)
  assert.equal(r.kind, 'comparison')
  if (r.kind === 'comparison') {
    assert.equal(r.comparison.scenarios.length, 2)
    assert.ok(r.comparison.scenarios.every(s => s.every(op => op.lever !== 'builtUpPct')))
    assert.ok(r.assumptions.some(a => a.includes('Example amount')))
  }
})
test('low-confidence or unsupported constraints do not produce an executable comparison', () => {
  const q = exploreQuestions('more trees')
  const changes: Answers[] = [{ scope: answer('unsupported') }, { builtUpPct: answer('hold', 0.4) }, { canopyPct: answer('unclear') }]
  for (const changed of changes) {
    assert.equal(resolveExploration({ ...defaults, ...changed }, q.operations, baseline, ctx).kind, 'clarification')
  }
})
test('a missing-water request cannot be executed', () => {
  const q = exploreQuestions('more water')
  const r = resolveExploration({ ...defaults, waterKm2: answer('more_default') }, q.operations, { ...baseline, waterKm2: null }, ctx)
  assert.equal(r.kind, 'clarification')
})
test('an omitted lever does not require a speculative quantity to be confident', () => {
  const q = exploreQuestions('Compare cleaner-air options but keep tree cover and built-up unchanged.')
  const r = resolveExploration({ ...defaults, goal: answer('air'), canopyPct: answer('hold'), vehiclesIndex: answer('unclear', 0.1), presence_vehiclesIndex: answer('not_stated') }, q.operations, baseline, ctx)
  assert.equal(r.kind, 'comparison')
  if (r.kind === 'comparison') assert.equal(r.comparison.scenarios[0][0].lever, 'vehiclesIndex')
})
test('explicit comparison grammar excludes bundled and negated commands', () => {
  assert.equal(exploreQuestions('Compare trees with vehicles. Keep built-up unchanged.').explicitMode, 'compare')
  assert.equal(exploreQuestions('Compare trees and lakes together with fewer vehicles.').explicitMode, undefined)
  assert.equal(exploreQuestions('Do not compare trees with vehicles.').explicitMode, undefined)
})
test('claim uncertainty routes to clarification, not a supported badge', () => {
  assert.equal(resolveClaim({ verdict: answer('supported', 0.4), topic: answer('vehicles') }).verdict, 'unclear')
})
test('numeric candidates include zero targets and do not fabricate absent values', () => {
  const options = exploreQuestions('Set vehicles to 0 and canopy to 12').operations
  assert.ok(Object.values(options.vehiclesIndex).some(o => o.mode === 'set' && o.amount === 0))
  assert.ok(!Object.values(options.canopyPct).some(o => o.mode === 'set' && o.amount === 17))
})
test('claim/source checks preserve missing-quote and uncertain-source outcomes', () => {
  assert.ok(quotePresent('The  canopy\nprovides shade.', 'The canopy provides shade.'))
  assert.ok(!quotePresent('Air temperature was measured.', 'Surface temperature was measured.'))
  assert.equal(resolveEvidence({ support: answer('supports', 0.3) }), 'review')
})
test('API derives trusted city baseline and strips model outputs supplied by a client', () => {
  const r = readAssistantRequest({ action: 'check', text: 'test', cityId: 'bangalore', sliders: baseline, ctx, output: { tempC: -1000 } })
  assert.equal(r.baseline.tempC, baseline.tempC)
  assert.ok(!('output' in r))
})
test('route rejects bad input, foreign origins and oversized bodies without inference', async () => {
  for (const [body, headers, expected] of [
    ['{}', { 'Content-Type': 'application/json' }, 400],
    ['{}', { 'Content-Type': 'application/json', Origin: 'https://other.test' }, 403],
    ['x'.repeat(17000), { 'Content-Type': 'application/json' }, 413],
    ['{', { 'Content-Type': 'application/json' }, 400],
  ] as const) {
    const response = await POST(new Request('http://localhost:3000/api/assistant', { method: 'POST', headers, body }))
    assert.equal(response.status, expected)
  }
})
test('missing API key returns a graceful fallback and never leaks configuration', async () => {
  const key = process.env.TYPESAFE_API_KEY
  delete process.env.TYPESAFE_API_KEY
  try {
    const response = await POST(new Request('http://localhost:3000/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'explore', text: 'more trees', cityId: 'bangalore', sliders: baseline, ctx }) }))
    assert.equal(response.status, 503)
    assert.match((await response.json()).error, /guided comparisons/)
  } finally { if (key) process.env.TYPESAFE_API_KEY = key }
})
test('provider failures return a safe 503 without raw SDK details', async () => {
  const key = process.env.TYPESAFE_API_KEY, fetcher = globalThis.fetch
  process.env.TYPESAFE_API_KEY = 'test-only-placeholder'
  globalThis.fetch = async () => { throw new Error('private upstream diagnostic') }
  try {
    const response = await POST(new Request('http://localhost:3000/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'explore', text: 'compare trees with vehicles', cityId: 'bangalore', sliders: baseline, ctx }) }))
    assert.equal(response.status, 503)
    assert.ok(!JSON.stringify(await response.json()).includes('private upstream'))
  } finally {
    globalThis.fetch = fetcher
    if (key) process.env.TYPESAFE_API_KEY = key; else delete process.env.TYPESAFE_API_KEY
  }
})
