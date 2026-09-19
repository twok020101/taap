'use client'

import { useEffect, useRef } from 'react'
import type { SliderState, SimContext, PresetYear, ZoneKey, WindDir } from '@/cities/types'
import { readComparison, type Comparison } from '@/lib/scenarios'

/**
 * Shareable simulator scenario serialised into `window.location.hash`.
 *
 * Encoded as a URL-encoded query string (`k=v&k=v...`) stored in the hash
 * fragment so the server never sees it. Numeric values preserve their precision so a shared comparison
 * has exactly the same starting point after reload.
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
  comparison?: Comparison | null
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
  params.set(KEYS.canopyPct, String(s.sliders.canopyPct))
  params.set(KEYS.builtUpPct, String(s.sliders.builtUpPct))
  if (s.sliders.waterKm2 !== null) params.set(KEYS.waterKm2, String(s.sliders.waterKm2))
  params.set(KEYS.vehiclesIndex, String(s.sliders.vehiclesIndex))
  params.set(KEYS.populationM, String(s.sliders.populationM))
  params.set(KEYS.linkedMode, s.linkedMode ? '1' : '0')
  params.set(KEYS.activePreset, s.activePreset ?? 'custom')
  params.set(KEYS.basemap, s.basemap)
  params.set(KEYS.month, String(s.ctx.month))
  params.set(KEYS.windDir, s.ctx.windDir)
  params.set(KEYS.aod, String(s.ctx.aod))
  params.set(KEYS.zone, s.ctx.zone)
  params.set(KEYS.timeOfDay, s.ctx.timeOfDay ?? 'day')
  if (s.comparison) params.set('compare', JSON.stringify(s.comparison))
  return params.toString()
}

export function decodeScenario(
  hash: string,
  validZones: ZoneKey[],
  waterAvailable = true,
): Partial<Scenario> | null {
  if (!hash || hash.length > 16000) return null
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
  if (!waterAvailable) sliders.waterKm2 = null
  else if (w !== null) sliders.waterKm2 = clamp(w, 0, 1000)
  if (v !== null) sliders.vehiclesIndex = clamp(v, 0, 500)
  if (p !== null) sliders.populationM = clamp(p, 0, 100)
  if (Object.keys(sliders).length > 0) out.sliders = sliders as SliderState

  const l = params.get(KEYS.linkedMode)
  if (l === '0' || l === '1') out.linkedMode = l === '1'

  const pr = params.get(KEYS.activePreset)
  if (pr && PRESET_VALUES.includes(pr as PresetYear)) {
    out.activePreset = pr as PresetYear
  } else if (pr === 'custom' || Object.keys(sliders).length > 0) out.activePreset = null

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

  const comparison = params.get('compare')
  if (comparison) {
    try { out.comparison = readComparison(JSON.parse(comparison), validZones, waterAvailable) } catch { /* Ignore malformed shared data. */ }
  }

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

function numOrNull(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
