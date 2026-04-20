'use client'

import { useEffect, useRef } from 'react'
import type { SliderState, SimContext, PresetYear, ZoneKey, WindDir } from '@/cities/types'

/**
 * Shareable simulator scenario serialised into `window.location.hash`.
 *
 * Encoded as a URL-encoded query string (`k=v&k=v...`) stored in the hash
 * fragment so the server never sees it. Numeric values are rounded to one
 * decimal to keep URLs short; integers (month, populationM) stay integer.
 *
 * Short keys (compact URLs, still readable):
 *   c  canopyPct    b  builtUpPct    w  waterKm2    v  vehiclesIndex
 *   p  populationM  l  linkedMode    pr activePreset bm basemap
 *   m  month        wd windDir       a  aod         z  zone
 *   t  timeOfDay
 */

export interface Scenario {
  sliders: SliderState
  linkedMode: boolean
  activePreset: PresetYear | null
  basemap: 'dark' | 'satellite'
  ctx: SimContext
}

const KEYS = {
  canopyPct: 'c',
  builtUpPct: 'b',
  waterKm2: 'w',
  vehiclesIndex: 'v',
  populationM: 'p',
  linkedMode: 'l',
  activePreset: 'pr',
  basemap: 'bm',
  month: 'm',
  windDir: 'wd',
  aod: 'a',
  zone: 'z',
  timeOfDay: 't',
} as const

const PRESET_VALUES: PresetYear[] = ['1973', '2000', '2024', '2026']
const WIND_DIRS: WindDir[] = ['N', 'E', 'S', 'W']

export function encodeScenario(s: Scenario): string {
  const params = new URLSearchParams()
  params.set(KEYS.canopyPct, round1(s.sliders.canopyPct))
  params.set(KEYS.builtUpPct, round1(s.sliders.builtUpPct))
  params.set(KEYS.waterKm2, round1(s.sliders.waterKm2))
  params.set(KEYS.vehiclesIndex, round1(s.sliders.vehiclesIndex))
  params.set(KEYS.populationM, round1(s.sliders.populationM))
  params.set(KEYS.linkedMode, s.linkedMode ? '1' : '0')
  if (s.activePreset) params.set(KEYS.activePreset, s.activePreset)
  params.set(KEYS.basemap, s.basemap)
  params.set(KEYS.month, String(s.ctx.month))
  params.set(KEYS.windDir, s.ctx.windDir)
  params.set(KEYS.aod, round2(s.ctx.aod))
  params.set(KEYS.zone, s.ctx.zone)
  params.set(KEYS.timeOfDay, s.ctx.timeOfDay ?? 'day')
  return params.toString()
}

export function decodeScenario(
  hash: string,
  validZones: ZoneKey[],
): Partial<Scenario> | null {
  if (!hash) return null
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash
  if (!stripped) return null
  const params = new URLSearchParams(stripped)

  const out: Partial<Scenario> = {}

  const sliders: Partial<SliderState> = {}
  const c = numOrNull(params.get(KEYS.canopyPct))
  const b = numOrNull(params.get(KEYS.builtUpPct))
  const w = numOrNull(params.get(KEYS.waterKm2))
  const v = numOrNull(params.get(KEYS.vehiclesIndex))
  const p = numOrNull(params.get(KEYS.populationM))
  if (c !== null) sliders.canopyPct = clamp(c, 0, 100)
  if (b !== null) sliders.builtUpPct = clamp(b, 0, 100)
  if (w !== null) sliders.waterKm2 = clamp(w, 0, 1000)
  if (v !== null) sliders.vehiclesIndex = clamp(v, 0, 500)
  if (p !== null) sliders.populationM = clamp(p, 0, 100)
  if (Object.keys(sliders).length > 0) out.sliders = sliders as SliderState

  const l = params.get(KEYS.linkedMode)
  if (l === '0' || l === '1') out.linkedMode = l === '1'

  const pr = params.get(KEYS.activePreset)
  if (pr && PRESET_VALUES.includes(pr as PresetYear)) {
    out.activePreset = pr as PresetYear
  }

  const bm = params.get(KEYS.basemap)
  if (bm === 'dark' || bm === 'satellite') out.basemap = bm

  const ctx: Partial<SimContext> = {}
  const m = numOrNull(params.get(KEYS.month))
  if (m !== null && m >= 1 && m <= 12) ctx.month = Math.round(m)
  const wd = params.get(KEYS.windDir)
  if (wd && WIND_DIRS.includes(wd as WindDir)) ctx.windDir = wd as WindDir
  const a = numOrNull(params.get(KEYS.aod))
  if (a !== null) ctx.aod = clamp(a, 0.1, 1.0)
  const z = params.get(KEYS.zone)
  if (z && validZones.includes(z)) ctx.zone = z
  const t = params.get(KEYS.timeOfDay)
  if (t === 'day' || t === 'night') ctx.timeOfDay = t
  if (Object.keys(ctx).length > 0) out.ctx = ctx as SimContext

  return Object.keys(out).length > 0 ? out : null
}

export function useWriteScenarioHash(scenario: Scenario, enabled: boolean): void {
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (!enabled) return
    const encoded = encodeScenario(scenario)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const current = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      if (current !== encoded) {
        const newUrl = `${window.location.pathname}${window.location.search}#${encoded}`
        window.history.replaceState(null, '', newUrl)
      }
    })
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scenario, enabled])
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString()
}
function round2(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}
function numOrNull(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
