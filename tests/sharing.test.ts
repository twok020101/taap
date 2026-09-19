import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeScenario, decodeScenario } from '../components/simulator/use-scenario-hash'
import { DEFAULT_OPERATIONS, type Comparison } from '../lib/scenarios'
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
