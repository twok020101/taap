import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeScenario, decodeScenario } from '../components/simulator/use-scenario-hash'
import { DEFAULT_OPERATIONS, applyOperations, sameScenarioInputs, type Comparison } from '../lib/scenarios'
import type { SimContext } from '../cities/types'

test('shared comparisons preserve fractional inputs and selected context on reload', () => {
  const sliders = { canopyPct: 4.66, builtUpPct: 70.35, waterKm2: 36, vehiclesIndex: 50, populationM: 12.44 }
  const ctx: SimContext = { month: 9, windDir: 'W', aod: 0.43, zone: 'central', timeOfDay: 'night' }
  const comparison: Comparison = { base: sliders, ctx, goal: 'both', scenarios: [[DEFAULT_OPERATIONS.canopyPct], [DEFAULT_OPERATIONS.vehiclesIndex]] }
  const hash = encodeScenario({ sliders, ctx, linkedMode: false, activePreset: null, basemap: 'dark', comparison })
  const restored = decodeScenario(hash, ['central'])
  assert.deepEqual(restored?.sliders, sliders)
  assert.deepEqual(restored?.comparison, comparison)
  assert.deepEqual(restored?.ctx, ctx)
  assert.equal(restored?.activePreset, null)
})
test('missing water and malformed shared comparisons cannot invent inputs', () => {
  assert.equal(decodeScenario('#w=20', ['central'], false)?.sliders?.waterKm2, null)
  assert.equal(decodeScenario('#compare=not-json', ['central']), null)
  assert.equal(decodeScenario('#' + 'a'.repeat(17000), ['central']), null)
})

test('applied scenarios survive sharing and alternatives use the saved start without accumulating changes', () => {
  const base = { canopyPct: 6, builtUpPct: 93, waterKm2: null, vehiclesIndex: 100, populationM: 14.5 }
  const ctx: SimContext = { month: 4, windDir: 'N', aod: 0.4, zone: 'central' }
  const comparison: Comparison = { base, ctx, goal: 'both', scenarios: [[DEFAULT_OPERATIONS.canopyPct], [DEFAULT_OPERATIONS.vehiclesIndex]] }
  const trees = applyOperations(base, comparison.scenarios[0])
  const restored = decodeScenario(encodeScenario({ sliders: trees, ctx, linkedMode: false, activePreset: null, basemap: 'dark', comparison }), ['central'], false)!
  assert.ok(sameScenarioInputs(trees, ctx, restored.sliders as typeof trees, restored.ctx as SimContext))
  assert.ok(sameScenarioInputs(trees, ctx, applyOperations(restored.comparison!.base, restored.comparison!.scenarios[0]), restored.comparison!.ctx))
  const vehicles = applyOperations(restored.comparison!.base, restored.comparison!.scenarios[1])
  assert.equal(vehicles.canopyPct, base.canopyPct)
  assert.equal(vehicles.vehiclesIndex, 90)
  assert.equal(sameScenarioInputs(vehicles, ctx, trees, ctx), false)
  assert.equal(sameScenarioInputs(trees, { ...ctx, month: 5 }, trees, ctx), false)
  assert.equal(sameScenarioInputs(trees, { ...ctx, timeOfDay: 'night' }, trees, ctx), false)
  assert.equal(sameScenarioInputs({ ...trees, waterKm2: 0 }, ctx, trees, ctx), false)
})
