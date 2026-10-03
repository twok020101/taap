'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Moon, Satellite } from 'lucide-react'
import { useAmbientTemp } from '@/components/ambient/ambient-particles'
import { SliderPanel } from '@/components/simulator/slider-panel'
import { Readouts } from '@/components/simulator/readouts'
import { HeatmapMap } from '@/components/simulator/heatmap-map'
import { HonestyInline } from '@/components/simulator/honesty-inline'
import { ClimateContext } from '@/components/simulator/climate-context'
import { LiveWeatherStrip } from '@/components/simulator/live-weather-strip'
import { ScenarioExplorer } from '@/components/simulator/scenario-explorer'
import { EnvironmentalImpact } from '@/components/simulator/environmental-impact'
import { ShareScenarioButton } from '@/components/simulator/share-scenario-button'
import type { Comparison } from '@/lib/scenarios'
import { getReferenceContext } from '@/lib/baselines'
import { track } from '@vercel/analytics'
import { simulate } from '@/model/simulate'
import { resolveScenario, scenarioUrl, useWriteScenarioHash, type Scenario } from '@/components/simulator/use-scenario-hash'
import type { CityConfig, SliderState, PresetYear, Baseline, SimContext, ZoneKey } from '@/cities/types'
import type { LiveWeather } from '@/lib/sources/openMeteo'
import type { LiveAq } from '@/lib/sources/openAQ'

interface SimulatorClientProps {
  city: CityConfig
  baseline: Baseline
  presets: Record<PresetYear, Baseline>
  liveWeather: LiveWeather | null
  liveAq: LiveAq | null
}

/** Demonstration interaction assumption, not an empirically calibrated ratio. */
const COUPLING_RATIO = 0.6
const SLIDER_BOUNDS = {
  canopyPct: { min: 0, max: 100 },
  builtUpPct: { min: 0, max: 100 },
} as const

export function SimulatorClient({ city, baseline, presets, liveWeather, liveAq }: SimulatorClientProps) {
  const referenceScenario = useMemo<Scenario>(() => ({
    sliders: {
      canopyPct: baseline.canopyPct,
      builtUpPct: baseline.builtUpPct,
      waterKm2: baseline.waterKm2,
      vehiclesIndex: baseline.vehiclesIndex,
      populationM: baseline.populationM,
    },
    linkedMode: true,
    activePreset: '2026',
    comparison: null,
    basemap: 'dark',
    ctx: getReferenceContext(city),
  }), [baseline, city])
  const [scenario, setScenario] = useState<Scenario>(referenceScenario)
  const { sliders, linkedMode, activePreset, basemap, ctx } = scenario
  const comparison = scenario.comparison ?? null
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const [hydrated, setHydrated] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [manualUrl, setManualUrl] = useState('')
  const manualLink = useRef<HTMLInputElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const restore = () => {
      setScenario(resolveScenario(window.location.hash, referenceScenario, Object.keys(city.zones), baseline.waterKm2 !== null))
      setCopyState('idle')
      setManualUrl('')
      setHydrated(true)
    }
    // Browser URL state is external to the server render. Restore on navigation too.
    restore()
    window.addEventListener('hashchange', restore)
    window.addEventListener('popstate', restore)
    return () => {
      window.removeEventListener('hashchange', restore)
      window.removeEventListener('popstate', restore)
    }
  }, [referenceScenario, city.zones, baseline.waterKm2])

  useEffect(() => {
    if (copyState === 'manual') {
      manualLink.current?.focus()
      manualLink.current?.select()
    }
  }, [copyState, manualUrl])

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])
  useWriteScenarioHash(scenario, hydrated)

  const handleCopyLink = useCallback(async () => {
    // Serialize the state being displayed, even before the debounced hash writer runs.
    const url = scenarioUrl(scenario, window.location.href)
    window.history.replaceState(window.history.state, '', url)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    try {
      await navigator.clipboard.writeText(url)
      track('scenario_shared', { city: city.id, comparison: comparison !== null })
      setCopyState('copied')
      setManualUrl('')
      copyTimer.current = setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setManualUrl(url)
      setCopyState('manual')
    }
  }, [city.id, comparison, scenario])

  const handleSliderChange = useCallback((key: keyof SliderState, value: number) => {
    setScenario(prev => {
      const next: SliderState = { ...prev.sliders, [key]: value }
      if (prev.linkedMode && (key === 'canopyPct' || key === 'builtUpPct')) {
        const otherKey = key === 'canopyPct' ? 'builtUpPct' : 'canopyPct'
        const bounds = SLIDER_BOUNDS[otherKey]
        const coupled = prev.sliders[otherKey] - COUPLING_RATIO * (value - prev.sliders[key])
        next[otherKey] = Math.max(bounds.min, Math.min(bounds.max, coupled))
      }
      return { ...prev, sliders: next, activePreset: null }
    })
  }, [])

  const handlePresetSelect = useCallback((year: PresetYear) => {
    const preset = year === '2026' ? baseline : presets[year]
    setScenario(prev => ({ ...prev, activePreset: year, sliders: {
      canopyPct: preset.canopyPct,
      builtUpPct: preset.builtUpPct,
      waterKm2: baseline.waterKm2 === null ? null : preset.waterKm2,
      vehiclesIndex: preset.vehiclesIndex,
      populationM: preset.populationM,
    } }))
  }, [presets, baseline])

  const handleZoneChange = useCallback((zone: ZoneKey) => {
    const z = city.zones[zone]
    if (!z) return
    setScenario(prev => ({ ...prev, activePreset: null,
      sliders: { ...prev.sliders, canopyPct: z.canopyPct, builtUpPct: z.builtUpPct, waterKm2: baseline.waterKm2 === null ? null : z.waterKm2 },
      ctx: { ...prev.ctx, zone },
    }))
  }, [city, baseline.waterKm2])

  const handleApplyScenario = useCallback((next: SliderState, context: SimContext) => {
    setScenario(prev => ({ ...prev, sliders: next, ctx: context, linkedMode: false, activePreset: null }))
    requestAnimationFrame(() => {
      resultsHeading.current?.focus({ preventScroll: true })
      resultsHeading.current?.scrollIntoView({ block: 'start' })
    })
  }, [])
  const updateContext = (update: Partial<SimContext>) => setScenario(prev => ({ ...prev, ctx: { ...prev.ctx, ...update } }))
  const handleComparison = (value: Comparison | null) => setScenario(prev => ({ ...prev, comparison: value }))
  const output = simulate(city, baseline, sliders, ctx)
  useAmbientTemp(output.tempC)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-72">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Interactive engineering demo</p>
          <h1 className="text-3xl font-bold tracking-tight">{city.name} Heat Simulator</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Compare a change, inspect the response, then share the exact scenario.
            This educational model uses explicit demo assumptions and a mixed-year reference scenario.
          </p>
        </div>
        <ShareScenarioButton onCopy={handleCopyLink} copied={copyState === 'copied'} />
      </div>

      <HonestyInline cityId={city.id} waterAvailable={baseline.waterKm2 !== null} />
      <ScenarioExplorer city={city} baseline={baseline} sliders={sliders} ctx={ctx}
        comparison={comparison} onComparison={handleComparison} onApply={handleApplyScenario}
        onShare={handleCopyLink} copied={copyState === 'copied'} />

      <section className="mt-8" aria-labelledby="simulation-results-title">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-72">
            <h2 id="simulation-results-title" ref={resultsHeading} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold">Current simulation</h2>
            <p className="mt-1 text-sm">Illustrative temperature-equivalent response: <strong>{output.tempDelta > 0 ? '+' : ''}{output.tempDelta.toFixed(1)}°C</strong> from reference.</p>
            <p className="mt-1 text-xs text-muted-foreground">PM2.5 scenario: {output.pm25.toFixed(1)} µg/m³. These outputs are not measured or predicted air temperature, surface temperature, or air quality.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareScenarioButton onCopy={handleCopyLink} copied={copyState === 'copied'} />
            {comparison && <button className="rounded-md border px-3 py-2 text-sm hover:bg-accent" onClick={() => {
              const heading = document.getElementById('explorer-title')
              heading?.focus({ preventScroll: true })
              heading?.scrollIntoView({ block: 'start' })
            }}>Back to comparison</button>}
          </div>
        </div>
        <div aria-live="polite" className="text-sm">
          {copyState === 'copied' && <p className="mb-3 text-emerald-300">Exact scenario link copied.</p>}
          {copyState === 'manual' && <div className="mb-4 rounded-lg border p-3">
            <label htmlFor="manual-scenario-link" className="block">Clipboard access is unavailable. Copy this exact scenario link:</label>
            <input ref={manualLink} id="manual-scenario-link" readOnly value={manualUrl} onFocus={event => event.target.select()} className="mt-2 w-full min-w-0 rounded border bg-background p-2 font-mono text-xs" />
          </div>}
        </div>
        <Readouts cityId={city.id} output={output} baseline={{ tempC: baseline.tempC, pm25: baseline.pm25 }} liveAq={liveAq} />

        <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Illustrative spatial pattern. Satellite imagery is background only.</p>
          <div className="flex overflow-hidden rounded-md border border-border">
            <button onClick={() => setScenario(prev => ({ ...prev, basemap: 'dark' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${basemap === 'dark' ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              aria-pressed={basemap === 'dark'} title="Dark basemap"><Moon className="h-3.5 w-3.5" />Dark</button>
            <button onClick={() => setScenario(prev => ({ ...prev, basemap: 'satellite' }))}
              className={`flex items-center gap-1.5 border-l border-border px-3 py-1.5 text-xs ${basemap === 'satellite' ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              aria-pressed={basemap === 'satellite'} title="Satellite basemap"><Satellite className="h-3.5 w-3.5" />Satellite</button>
          </div>
        </div>
        <HeatmapMap city={city} baseline={baseline} sliders={sliders} ctx={ctx} basemap={basemap} />
      </section>

      <details className="mt-8 rounded-xl border bg-card/50 p-5">
        <summary className="cursor-pointer text-lg font-semibold">Advanced controls: inputs & climate context</summary>
        <p className="mt-3 text-sm text-muted-foreground">Explore assumptions manually. Linked mode couples canopy and built-up changes using a demo ratio. Guided comparisons always keep other inputs fixed.</p>
        <div className="my-5 flex flex-wrap gap-3">
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-accent" onClick={() => { setScenario(referenceScenario); setCopyState('idle'); setManualUrl('') }}>Reset to reference scenario</button>
          <a href={`/${city.id}/about`} className="px-1 py-2 text-sm underline">Inspect assumptions and sources</a>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SliderPanel sliders={sliders} activePreset={activePreset} linkedMode={linkedMode}
            onSliderChange={handleSliderChange} onPresetSelect={handlePresetSelect}
            onLinkedModeChange={linked => setScenario(prev => ({ ...prev, linkedMode: linked }))} />
          <ClimateContext city={city} ctx={ctx} onMonthChange={month => updateContext({ month })}
            onWindDirChange={windDir => updateContext({ windDir })} onAodChange={aod => updateContext({ aod })}
            onZoneChange={handleZoneChange} onTimeOfDayChange={timeOfDay => updateContext({ timeOfDay })} />
        </div>
      </details>

      <EnvironmentalImpact city={city} baseline={baseline} sliders={sliders} ctx={ctx} />
      {liveWeather && <div className="mt-8"><LiveWeatherStrip cityName={city.name} weather={liveWeather} liveAq={liveAq} /></div>}
      <div className="mt-8 rounded-lg border bg-card/50 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Reference scenario assembled from mixed-year sources:</strong>{' '}
        Canopy {baseline.canopyPct}% · Built-up {baseline.builtUpPct}% ·
        Water {baseline.waterKm2 === null ? 'unavailable' : `${baseline.waterKm2} km²`} · Vehicles index {baseline.vehiclesIndex} ·
        Population {baseline.populationM} M · Temperature anchor {baseline.tempC}°C · PM2.5 anchor {baseline.pm25} µg/m³.
        <p className="mt-2">April, north wind, reference aerosol level, {city.zones[referenceScenario.ctx.zone]?.label}, daytime defines zero change. The temperature anchor has no verified common measurement metric. <a href={`/${city.id}/about`} className="underline">Per-input dates, provenance and limits</a>.</p>
      </div>
    </div>
  )
}
