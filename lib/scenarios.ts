import type { Baseline, CityConfig, SimContext, SliderState } from '@/cities/types'
import { coefficients } from '@/model/coefficients'
import { simulate, type CoefficientValues } from '@/model/simulate'

export const LEVERS = ['canopyPct', 'builtUpPct', 'waterKm2', 'vehiclesIndex'] as const
export type Lever = typeof LEVERS[number]
export type Goal = 'heat' | 'air' | 'both'
export type Operation = { lever: Lever; mode: 'add' | 'set' | 'percent'; amount: number }
export interface Comparison {
  base: SliderState
  ctx: SimContext
  goal: Goal
  scenarios: Operation[][]
}
export const LIMITS = {
  canopyPct: [0, 100], builtUpPct: [0, 100], waterKm2: [0, 1000],
  vehiclesIndex: [0, 500], populationM: [0, 100],
} as const
export const LEVER_LABELS: Record<Lever, string> = {
  canopyPct: 'Tree canopy', builtUpPct: 'Built-up area', waterKm2: 'Water bodies', vehiclesIndex: 'Vehicles index',
}
export const DEFAULT_OPERATIONS: Record<Lever, Operation> = {
  canopyPct: { lever: 'canopyPct', mode: 'add', amount: 5 },
  builtUpPct: { lever: 'builtUpPct', mode: 'add', amount: -5 },
  waterKm2: { lever: 'waterKm2', mode: 'add', amount: 1 },
  vehiclesIndex: { lever: 'vehiclesIndex', mode: 'percent', amount: -10 },
}
export const round = (n: number) => Math.round(n * 100) / 100
export const signed = (n: number) => `${n > 0 ? '+' : ''}${round(n)}`
export function operationLabel(op: Operation): string {
  const unit = op.lever === 'waterKm2' ? 'km²' : op.lever === 'vehiclesIndex' ? 'index points' : 'percentage points'
  if (op.mode === 'percent') return `${LEVER_LABELS[op.lever]} ${signed(op.amount)}% relative to starting value`
  if (op.mode === 'set') return `${LEVER_LABELS[op.lever]} to ${op.amount}${op.lever.endsWith('Pct') ? '%' : op.lever === 'waterKm2' ? ' km²' : ' index points'}`
  return `${LEVER_LABELS[op.lever]} ${signed(op.amount)} ${unit}`
}

/** Never clamp a requested change silently: the UI must show the actual assumption. */
export function applyOperations(base: SliderState, ops: Operation[]): SliderState {
  const next = { ...base }
  for (const op of ops) {
    const start = base[op.lever]
    if (start === null) throw new Error('Water-area evidence is missing. Choose another intervention.')
    const value = round(op.mode === 'set' ? op.amount : op.mode === 'add' ? start + op.amount : start * (1 + op.amount / 100))
    const [min, max] = LIMITS[op.lever]
    if (value < min || value > max || !Number.isFinite(value)) throw new Error(`${LEVER_LABELS[op.lever]} would fall outside ${min}–${max}. Choose a smaller change.`)
    if (value === start) throw new Error(`${LEVER_LABELS[op.lever]} would not change. Choose a different amount.`)
    next[op.lever] = value
  }
  return next
}

export function readSliders(value: unknown, waterAvailable: boolean): SliderState | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const out: Record<string, number | null> = {}
  for (const key of Object.keys(LIMITS) as (keyof SliderState)[]) {
    if (key === 'waterKm2' && !waterAvailable) { out[key] = null; continue }
    const v = raw[key]
    const [lo, hi] = LIMITS[key]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) return null
    out[key] = v
  }
  return out as unknown as SliderState
}
export function readContext(value: unknown, zones: string[]): SimContext | null {
  if (!value || typeof value !== 'object') return null
  const v = value as SimContext
  if (!Number.isInteger(v.month) || v.month < 1 || v.month > 12 || !['N', 'E', 'S', 'W'].includes(v.windDir)
    || typeof v.aod !== 'number' || !Number.isFinite(v.aod) || v.aod < 0.1 || v.aod > 1
    || !zones.includes(v.zone) || !['day', 'night'].includes(v.timeOfDay ?? 'day')) return null
  return { month: v.month, windDir: v.windDir, aod: v.aod, zone: v.zone, timeOfDay: v.timeOfDay ?? 'day' }
}
export function readComparison(value: unknown, zones: string[], waterAvailable: boolean): Comparison | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Comparison
  const base = readSliders(v.base, waterAvailable)
  const ctx = readContext(v.ctx, zones)
  if (!base || !ctx || !['heat', 'air', 'both'].includes(v.goal) || !Array.isArray(v.scenarios) || v.scenarios.length < 1 || v.scenarios.length > 4) return null
  const scenarios: Operation[][] = []
  for (const ops of v.scenarios) {
    if (!Array.isArray(ops) || ops.length < 1 || ops.length > 4) return null
    const clean: Operation[] = []
    for (const op of ops) {
      if (!op || !LEVERS.includes(op.lever) || !['set', 'add', 'percent'].includes(op.mode)
        || typeof op.amount !== 'number' || !Number.isFinite(op.amount) || Math.abs(op.amount) > 1000
        || clean.some(x => x.lever === op.lever)) return null
      clean.push({ lever: op.lever, mode: op.mode, amount: op.amount })
    }
    try { applyOperations(base, clean) } catch { return null }
    scenarios.push(clean)
  }
  return { base, ctx, goal: v.goal, scenarios }
}

/** Paired runs share coefficient values. This cancels uncertainty from unchanged drivers. */
export function compareScenario(city: CityConfig, baseline: Baseline, base: SliderState, next: SliderState, ctx: SimContext) {
  const before = simulate(city, baseline, base, ctx)
  const after = simulate(city, baseline, next, ctx)
  const temp = { value: round(after.tempDelta - before.tempDelta), low: Infinity, high: -Infinity }
  const pm25 = { value: round(after.pm25Delta - before.pm25Delta), low: Infinity, high: -Infinity }
  let clippedTemp = false
  let clippedPm = false
  const keys = ['canopy', 'builtUp', 'water', 'vehicles'] as const
  for (let mask = 0; mask < 16; mask++) {
    const values: CoefficientValues = {}
    keys.forEach((key, i) => { values[key] = coefficients[key][mask & (1 << i) ? 'high' : 'low'] })
    const a = simulate(city, baseline, base, ctx, values)
    const b = simulate(city, baseline, next, ctx, values)
    const dt = round(b.tempDelta - a.tempDelta), dp = round(b.pm25Delta - a.pm25Delta)
    temp.low = Math.min(temp.low, dt); temp.high = Math.max(temp.high, dt)
    pm25.low = Math.min(pm25.low, dp); pm25.high = Math.max(pm25.high, dp)
    clippedTemp ||= [a.tempDelta, b.tempDelta].some(v => v <= -8 || v >= 12)
    clippedPm ||= [a.pm25, b.pm25].some(v => v <= 0 || v >= 500)
  }
  // At a clamp, a paired difference can have an interior extremum. Use the wider
  // interval enclosure there; endpoint sampling alone is not a guaranteed bound.
  if (clippedTemp && LEVERS.slice(0, 3).some(key => base[key] !== next[key])) {
    temp.low = Math.min(temp.low, round(after.bands.tempDelta.low - before.bands.tempDelta.high))
    temp.high = Math.max(temp.high, round(after.bands.tempDelta.high - before.bands.tempDelta.low))
  }
  if (clippedPm && base.vehiclesIndex !== next.vehiclesIndex) {
    pm25.low = Math.min(pm25.low, round(after.bands.pm25Delta.low - before.bands.pm25Delta.high))
    pm25.high = Math.max(pm25.high, round(after.bands.pm25Delta.high - before.bands.pm25Delta.low))
  }
  temp.low = Math.min(temp.low, temp.value); temp.high = Math.max(temp.high, temp.value)
  pm25.low = Math.min(pm25.low, pm25.value); pm25.high = Math.max(pm25.high, pm25.value)
  return { temp, pm25 }
}
