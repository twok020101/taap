import test from 'node:test'
import assert from 'node:assert/strict'
import { getCity } from '../cities'
import { getBaseline } from '../lib/baselines'
import { DEFAULT_OPERATIONS, applyOperations, compareScenario, readComparison, readContext, readSliders } from '../lib/scenarios'
import { simulate } from '../model/simulate'
import type { SimContext } from '../cities/types'

const city = getCity('bangalore')!, baseline = getBaseline('bangalore')!
const ctx: SimContext = { month: 4, windDir: 'N', aod: 0.4, zone: 'central', timeOfDay: 'day' }
test('population is context only, with no invented temperature or PM2.5 effect', () => {
  assert.deepEqual(simulate(city, baseline, { ...baseline, populationM: 30 }, ctx), simulate(city, baseline, baseline, ctx))
})
test('vehicle-only comparison leaves the complete temperature change and band at zero', () => {
  const next = applyOperations(baseline, [DEFAULT_OPERATIONS.vehiclesIndex])
  const result = compareScenario(city, baseline, baseline, next, ctx)
  assert.deepEqual(result.temp, { value: 0, low: 0, high: 0 })
  assert.deepEqual(result.pm25, { value: -4, low: -5, high: -3 })
})
test('a canopy intervention holds built-up and all other inputs fixed', () => {
  const next = applyOperations(baseline, [DEFAULT_OPERATIONS.canopyPct])
  assert.equal(next.canopyPct, 11)
  assert.equal(next.builtUpPct, baseline.builtUpPct)
  assert.deepEqual(compareScenario(city, baseline, baseline, next, ctx).pm25, { value: 0, low: 0, high: 0 })
})
test('explicit targets and relative quantities are distinct', () => {
  assert.equal(applyOperations(baseline, [{ lever: 'canopyPct', mode: 'set', amount: 20 }]).canopyPct, 20)
  assert.equal(applyOperations(baseline, [{ lever: 'canopyPct', mode: 'percent', amount: 20 }]).canopyPct, 7.2)
})
test('out-of-range and no-op requests are rejected rather than silently clamped', () => {
  assert.throws(() => applyOperations(baseline, [{ lever: 'canopyPct', mode: 'add', amount: 100 }]))
  assert.throws(() => applyOperations(baseline, [{ lever: 'vehiclesIndex', mode: 'percent', amount: 0 }]))
})
test('Mumbai missing water is not converted to a zero baseline', () => {
  const mumbai = getCity('mumbai')!, b = getBaseline('mumbai')!
  const c = { ...ctx, zone: Object.keys(mumbai.zones)[0] }
  assert.equal(b.waterKm2, null)
  assert.throws(() => applyOperations(b, [DEFAULT_OPERATIONS.waterKm2]))
  const result = simulate(mumbai, b, { ...b, waterKm2: 30 }, c)
  assert.ok(result.breakdown.water === 0)
  assert.ok(Number.isFinite(result.tempC))
  assert.equal(readSliders({ ...b, waterKm2: 900 }, false)?.waterKm2, null)
})
test('invalid URL or API states are rejected', () => {
  assert.equal(readSliders({ ...baseline, canopyPct: NaN }, true), null)
  assert.equal(readSliders({ ...baseline, canopyPct: 101 }, true), null)
  assert.equal(readContext({ ...ctx, zone: '__proto__' }, Object.keys(city.zones)), null)
  assert.equal(readContext({ ...ctx, month: 1.5 }, Object.keys(city.zones)), null)
  assert.equal(getCity('__proto__'), null)
  assert.equal(getBaseline('constructor'), null)
})
test('shared comparisons reject duplicate levers and invalid amounts', () => {
  const c = { base: baseline, ctx, goal: 'heat', scenarios: [[DEFAULT_OPERATIONS.canopyPct]] }
  assert.ok(readComparison(c, Object.keys(city.zones), true))
  assert.equal(readComparison({ ...c, scenarios: [[DEFAULT_OPERATIONS.canopyPct, DEFAULT_OPERATIONS.canopyPct]] }, Object.keys(city.zones), true), null)
  assert.equal(readComparison({ ...c, scenarios: [[{ lever: 'populationM', mode: 'set', amount: 5 }]] }, Object.keys(city.zones), true), null)
})
test('paired uncertainty bounds contain interior coefficient samples, including clipped scenarios', () => {
  for (const start of [baseline, { ...baseline, canopyPct: 90, builtUpPct: 5, waterKm2: 40, vehiclesIndex: 0 }]) {
    const next = { ...start, canopyPct: Math.max(0, start.canopyPct - 5), vehiclesIndex: start.vehiclesIndex + 10 }
    const band = compareScenario(city, baseline, start, next, ctx)
    for (const t of [0, 0.2, 0.45, 0.8, 1]) {
      const values = { canopy: 0.06 + 0.06 * t, builtUp: 0.05 + 0.05 * t, water: 0.3 + 0.5 * t, vehicles: 3 + 2 * t }
      const a = simulate(city, baseline, start, ctx, values), b = simulate(city, baseline, next, ctx, values)
      assert.ok(b.tempDelta - a.tempDelta >= band.temp.low - 0.011 && b.tempDelta - a.tempDelta <= band.temp.high + 0.011)
      assert.ok(b.pm25Delta - a.pm25Delta >= band.pm25.low - 0.11 && b.pm25Delta - a.pm25Delta <= band.pm25.high + 0.11)
    }
  }
})
