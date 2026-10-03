import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCity, cityIds } from '../cities'
import { getBaseline, getBaselineProvenance, getReferenceContext } from '../lib/baselines'
import { coefficients } from '../model/coefficients'
import { simulate } from '../model/simulate'
import { buildGrid } from '../model/grid'
import { simulateGrid } from '../model/simulate-grid'
import historicalPresets from '../data/bangalore/presets.json'

const close = (actual: number, expected: number, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`)

test('software invariant: every city has explicit zero-delta reference context', () => {
  for (const id of cityIds) {
    const city = getCity(id)!, baseline = getBaseline(id)!, reference = getReferenceContext(city)
    const result = simulate(city, baseline, baseline)
    assert.deepEqual(result.referenceContext, reference)
    assert.equal(reference.month, 4)
    assert.equal(reference.zone, Object.keys(city.zones)[0])
    assert.equal(result.tempDelta, 0)
    assert.equal(result.tempC, baseline.tempC)
    assert.equal(result.pm25Delta, 0)
    assert.equal(result.nightCoolLoss, 0)
    assert.deepEqual(result.bands.tempDelta, { low: 0, high: 0 })
    assert.equal(result.diagnostics.temperature.clipped, false)
    assert.equal(result.diagnostics.temperature.collapsedByClipping, false)
    assert.deepEqual(result, simulate(city, baseline, baseline, reference))
  }
})

test('software invariant: month and zone are differences from the reference context', () => {
  for (const id of cityIds) {
    const city = getCity(id)!, baseline = getBaseline(id)!, reference = getReferenceContext(city)
    const offsets = city.coefficientOverrides?.monsoonOffsets ?? coefficients.monsoonOffsets
    const may = simulate(city, baseline, baseline, { ...reference, month: 5 })
    close(may.breakdown.monsoon, Math.round((offsets[5] - offsets[4]) * 100) / 100)
    const alternate = Object.keys(city.zones)[1]
    const zone = simulate(city, baseline, baseline, { ...reference, zone: alternate })
    close(zone.breakdown.zoneOffset, Math.round((city.zones[alternate].tempOffsetC - city.zones[reference.zone].tempOffsetC) * 100) / 100)
  }
})

test('historical clipping retains raw response and does not imply certainty', () => {
  const city = getCity('bangalore')!, baseline = getBaseline('bangalore')!
  const result = simulate(city, baseline, historicalPresets['1973'])
  close(result.diagnostics.temperature.unclippedDelta, -22.0815)
  assert.equal(result.tempDelta, -8)
  assert.deepEqual(result.bands.tempDelta, { low: -8, high: -8 })
  assert.ok(result.diagnostics.temperature.unclippedLow < result.diagnostics.temperature.unclippedHigh)
  assert.equal(result.diagnostics.temperature.clipped, true)
  assert.equal(result.diagnostics.temperature.sensitivityClipped, true)
  assert.equal(result.diagnostics.temperature.collapsedByClipping, true)
  assert.ok(!Object.hasOwn(result, 'validated'))
})

test('sensitivity clipping is disclosed even when the central response is not clipped', () => {
  const city = getCity('bangalore')!, baseline = getBaseline('bangalore')!
  const result = simulate(city, baseline, { ...baseline, canopyPct: baseline.canopyPct + 70 })
  assert.equal(result.diagnostics.temperature.clipped, false)
  assert.equal(result.diagnostics.temperature.sensitivityClipped, true)
  assert.equal(result.diagnostics.temperature.collapsedByClipping, false)
  assert.equal(result.diagnostics.nightCoolLoss.sensitivityClipped, true)
})

test('PM2.5 and night-response proxies expose raw/clipped sensitivity ranges', () => {
  const city = getCity('bangalore')!, baseline = getBaseline('bangalore')!, reference = getReferenceContext(city)
  const result = simulate(city, { ...baseline, canopyPct: 0 }, { ...baseline, canopyPct: 100, vehiclesIndex: 0 }, { ...reference, aod: 0.1, windDir: 'W' })
  assert.equal(result.pm25, 0)
  assert.equal(result.diagnostics.pm25.clipped, true)
  assert.equal(result.diagnostics.pm25.collapsedByClipping, true)
  assert.ok(result.diagnostics.pm25.unclippedLow < result.diagnostics.pm25.unclippedHigh)
  assert.equal(result.diagnostics.nightCoolLoss.clipped, true)
  assert.ok(result.diagnostics.nightCoolLoss.unclippedLow < result.diagnostics.nightCoolLoss.unclippedHigh)
})

test('west-wind sensitivity propagates the shared land-use coefficient once', () => {
  const city = getCity('bangalore')!, baseline = getBaseline('bangalore')!
  const result = simulate(city, baseline, { ...baseline, canopyPct: baseline.canopyPct + 5 }, { ...getReferenceContext(city), windDir: 'W' })
  close(result.diagnostics.temperature.unclippedLow, -5 * 0.12 * 0.8)
  close(result.diagnostics.temperature.unclippedHigh, -5 * 0.06 * 0.8)
})

test('every input has conservative provenance, separate source years and evidence gaps', () => {
  for (const id of cityIds) {
    const p = getBaselineProvenance(id)!
    assert.equal(p.inputs.length, 7)
    assert.equal(new Set(p.inputs.map(row => row.input)).size, 7)
    assert.match(p.referenceLabel, /mixed-year/i)
    assert.ok(p.inputs.every(row => row.reviewStatus === 'unverified'))
    assert.ok(p.inputs.every(row => row.metric && row.note))
    assert.ok(p.inputs.every(row => !row.sourceUrl || row.sourceUrl.startsWith('https://')))
  }
  for (const id of ['bangalore', 'delhi']) {
    assert.ok(getBaselineProvenance(id)!.inputs.every(row => row.kind === 'assumed' && row.period === null && row.sourceYear === null))
  }
  const mumbai = getBaselineProvenance('mumbai')!
  assert.equal(mumbai.inputs.find(row => row.input === 'waterKm2')!.kind, 'unavailable')
  assert.match(mumbai.inputs.find(row => row.input === 'populationM')!.period!, /2011/)
  assert.match(mumbai.inputs.find(row => row.input === 'tempC')!.period!, /1991–2020/)
  const chennai = getBaselineProvenance('chennai')!
  assert.equal(chennai.inputs.find(row => row.input === 'waterKm2')!.kind, 'estimated')
  assert.match(chennai.inputs.find(row => row.input === 'builtUpPct')!.period!, /2016/)
  assert.equal(chennai.inputs.find(row => row.input === 'builtUpPct')!.sourceYear, 2017)
  assert.equal(getBaselineProvenance('__proto__'), null)
})

test('intervention coefficients are assumptions and Ziter is air-temperature mechanism evidence', () => {
  for (const key of ['canopy', 'builtUp', 'water', 'vehicles'] as const) {
    assert.equal(coefficients[key].evidenceStatus, 'assumed')
    assert.match(coefficients[key].source, /demonstration assumption/i)
  }
  assert.match(coefficients.canopy.source, /air temperature.*mechanism only, not this coefficient/i)
  assert.match(coefficients.vehicles.unit, /index points/)
  assert.doesNotMatch(coefficients.water.description, /500 m|LST/)
})

test('methodology source separates diagnostics and unverified provenance from validation', () => {
  const source = readFileSync('app/[city]/about/page.tsx', 'utf8')
  assert.match(source, /illustrative temperature-equivalent response/i)
  assert.match(source, /not a calibrated air-temperature or land-surface-temperature/)
  assert.match(source, /Mixed-year reference scenario/)
  assert.match(source, /Unclipped illustrative response/)
  assert.match(source, /Clipped display response/)
  assert.match(source, /not certainty/)
  assert.match(source, /Per-input provenance/)
  assert.match(source, /All entries below are unverified/)
  assert.doesNotMatch(source, /\bPASS\b|\bFAIL\b|22\.0|Observed \(IMD|VALIDATION_TARGETS|VALIDATION_GATE|Bangalore-calibrated/)
})

test('breakdown contains only the selected aerosol term and sums to the raw response', () => {
  const city = getCity('bangalore')!, baseline = getBaseline('bangalore')!
  for (const timeOfDay of ['day', 'night'] as const) {
    const result = simulate(city, baseline, { ...baseline, canopyPct: baseline.canopyPct + 10 }, { ...getReferenceContext(city), aod: 0.7, timeOfDay })
    assert.equal(result.breakdown[timeOfDay === 'day' ? 'aerosolNight' : 'aerosolDay'], 0)
    close(Object.values(result.breakdown).reduce((sum, value) => sum + value, 0), result.diagnostics.temperature.unclippedDelta, 0.03)
  }
})

test('synthetic grid remains deterministic and is not required to match the headline', () => {
  const city = getCity('bangalore')!, baseline = getBaseline('bangalore')!, reference = getReferenceContext(city)
  const grid = buildGrid(city)
  const a = simulateGrid(city, baseline, baseline, reference, grid)
  const b = simulateGrid(city, baseline, baseline, reference, grid)
  assert.deepEqual(a, b)
  assert.ok(a.tempDelta.length > 0)
  assert.ok(a.minDelta >= -8 && a.maxDelta <= 12)
  assert.notEqual(a.cityMeanTempDelta, simulate(city, baseline, baseline, reference).tempDelta)
})
