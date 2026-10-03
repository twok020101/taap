import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAllCities } from '../cities'
import { getReferenceContext } from '../lib/baselines'
import { DEFAULT_OPERATIONS, applyOperations, type Comparison } from '../lib/scenarios'
import { currentCopyFeedback, decodeScenario, encodeScenario, resolveScenario, scenarioUrl, type Scenario } from '../components/simulator/use-scenario-hash'

function reference(): Scenario {
  return {
    sliders: { canopyPct: 6, builtUpPct: 93, waterKm2: 4.5, vehiclesIndex: 100, populationM: 14.5 },
    ctx: { month: 4, windDir: 'N', aod: 0.4, zone: 'central', timeOfDay: 'day' },
    linkedMode: true, activePreset: '2026', basemap: 'dark', comparison: null,
  }
}

test('copying serializes current state even when the browser URL still describes an earlier frame', () => {
  const initial = reference()
  const comparison: Comparison = { base: initial.sliders, ctx: initial.ctx, goal: 'both', scenarios: [[DEFAULT_OPERATIONS.canopyPct], [DEFAULT_OPERATIONS.vehiclesIndex]] }
  const applied: Scenario = { ...initial, sliders: applyOperations(initial.sliders, comparison.scenarios[0]), comparison, linkedMode: false, activePreset: null }
  const staleUrl = `https://taap.thetwok.in/bangalore/simulator?demo=1#${encodeScenario(initial)}`
  const url = new URL(scenarioUrl(applied, staleUrl))
  assert.equal(url.origin, 'https://taap.thetwok.in')
  assert.equal(url.pathname, '/bangalore/simulator')
  assert.equal(url.search, '?demo=1')
  assert.deepEqual(resolveScenario(url.hash, initial, ['central']), applied)
  assert.notEqual(url.hash, new URL(staleUrl).hash)
})

test('versioned links round-trip all city contexts without rounding inputs', () => {
  for (const city of getAllCities()) {
    const state: Scenario = { ...reference(), sliders: { ...reference().sliders, canopyPct: 4.6666667, vehiclesIndex: 90.12345 }, ctx: { ...getReferenceContext(city), month: 9, aod: 0.437, timeOfDay: 'night' }, activePreset: null, basemap: 'satellite' }
    const encoded = encodeScenario(state)
    assert.equal(new URLSearchParams(encoded).get('sv'), '1')
    assert.deepEqual(resolveScenario(encoded, reference(), Object.keys(city.zones)), state)
  }
})

test('legacy links remain readable and explicitly unsupported versions are rejected', () => {
  const state = reference()
  const params = new URLSearchParams(encodeScenario(state))
  params.delete('sv')
  assert.deepEqual(resolveScenario(params.toString(), state, ['central']), state)
  params.set('sv', '999')
  assert.equal(decodeScenario(params.toString(), ['central']), null)
  params.set('sv', '')
  assert.equal(decodeScenario(params.toString(), ['central']), null)
})

test('history entries restore independently and clear absent comparisons instead of leaking prior state', () => {
  const initial = reference()
  const comparison: Comparison = { base: initial.sliders, ctx: initial.ctx, goal: 'both', scenarios: [[DEFAULT_OPERATIONS.canopyPct]] }
  const compared = { ...initial, comparison, activePreset: null }
  const entries = [encodeScenario(initial), encodeScenario(compared), '#c=12&m=8', '', '#compare=bad-json']
  const restored = entries.map(hash => resolveScenario(hash, initial, ['central']))
  assert.deepEqual(restored[0], initial)
  assert.deepEqual(restored[1].comparison, comparison)
  assert.equal(restored[2].sliders.canopyPct, 12)
  assert.equal(restored[2].sliders.builtUpPct, initial.sliders.builtUpPct)
  assert.equal(restored[2].ctx.month, 8)
  assert.equal(restored[2].comparison, null)
  assert.deepEqual(restored[3], initial)
  assert.deepEqual(restored[4], initial)
  assert.deepEqual(resolveScenario(entries[1], initial, ['central']), restored[1])
})

test('missing water and empty numeric fields do not create data on a shared link', () => {
  const initial = reference()
  const noWater = { ...initial, sliders: { ...initial.sliders, waterKm2: null } }
  assert.equal(resolveScenario('#w=50&c=', noWater, ['central'], false).sliders.waterKm2, null)
  assert.equal(resolveScenario('#c=&m=&a=', initial, ['central']).sliders.canopyPct, initial.sliders.canopyPct)
  assert.equal(resolveScenario('#c=&m=&a=', initial, ['central']).ctx.month, initial.ctx.month)
  assert.equal(resolveScenario('#c=&m=&a=', initial, ['central']).ctx.aod, initial.ctx.aod)
})

test('scenario links serialize only scenario inputs, never questions or provider data', () => {
  const state = { ...reference(), question: 'private question', claim: 'private claim', apiKey: 'do-not-share' }
  const url = scenarioUrl(state, 'https://taap.thetwok.in/bangalore/simulator')
  assert.doesNotMatch(url, /private|do-not-share|question|claim|apiKey/)
})

test('guided entry and result sharing stay before advanced controls; simulator skips timed intro', () => {
  const simulator = readFileSync(new URL('../components/simulator/simulator-client.tsx', import.meta.url), 'utf8')
  const intro = readFileSync(new URL('../components/globe/globe-intro-host.tsx', import.meta.url), 'utf8')
  const globe = readFileSync(new URL('../components/globe/globe-intro.tsx', import.meta.url), 'utf8')
  assert.ok(simulator.indexOf('<ScenarioExplorer') < simulator.indexOf('Advanced controls:'))
  assert.ok(simulator.indexOf('<ShareScenarioButton', simulator.indexOf('Current simulation')) < simulator.indexOf('Advanced controls:'))
  assert.match(simulator, /addEventListener\('hashchange', restore\)/)
  assert.match(simulator, /addEventListener\('popstate', restore\)/)
  assert.match(intro, /pathname\?\.split\('\/'\)\[2\] === 'simulator'\) return null/)
  assert.match(globe, /if \(window\.location\.hash\) return/)
})


test('manual-copy and copied feedback cannot show a stale scenario link after input changes', () => {
  const initial = reference()
  const comparison: Comparison = { base: initial.sliders, ctx: initial.ctx, goal: 'both', scenarios: [[DEFAULT_OPERATIONS.canopyPct], [DEFAULT_OPERATIONS.vehiclesIndex]] }
  const first: Scenario = { ...initial, comparison, sliders: applyOperations(initial.sliders, comparison.scenarios[0]), linkedMode: false, activePreset: null }
  const second: Scenario = { ...first, sliders: applyOperations(initial.sliders, comparison.scenarios[1]) }
  for (const status of ['manual', 'copied'] as const) {
    const feedback = { scenarioHash: encodeScenario(first), status, url: scenarioUrl(first, 'https://taap.thetwok.in/bangalore/simulator') }
    assert.deepEqual(currentCopyFeedback(first, feedback), feedback)
    assert.equal(currentCopyFeedback(second, feedback), null)
    assert.equal(currentCopyFeedback({ ...first, ctx: { ...first.ctx, month: 8 } }, feedback), null)
    assert.equal(currentCopyFeedback({ ...first, comparison: null }, feedback), null)
    assert.equal(currentCopyFeedback({ ...first, basemap: 'satellite' }, feedback), null)
    // A clipboard request resolving after scenario 2 is applied is still hidden.
    assert.equal(currentCopyFeedback(second, { ...feedback }), null)
    const latest = { scenarioHash: encodeScenario(second), status, url: scenarioUrl(second, feedback.url) }
    assert.deepEqual(currentCopyFeedback(second, latest), latest)
    assert.deepEqual(resolveScenario(new URL(latest.url).hash, initial, ['central']), second)
  }
})
