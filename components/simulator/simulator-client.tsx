'use client'

import { useState, useCallback } from 'react'
import { Moon, Satellite } from 'lucide-react'
import { useAmbientTemp } from '@/components/ambient/ambient-particles'
import { SliderPanel } from '@/components/simulator/slider-panel'
import { Readouts } from '@/components/simulator/readouts'
import { HeatmapMap } from '@/components/simulator/heatmap-map'
import { HonestyInline } from '@/components/simulator/honesty-inline'
import { ClimateContext } from '@/components/simulator/climate-context'
import { LiveWeatherStrip } from '@/components/simulator/live-weather-strip'
import { simulate } from '@/model/simulate'
import { zones } from '@/data/bangalore/zones'
import type { SliderState, PresetYear, Baseline, SimContext, ZoneKey, WindDir } from '@/cities/types'
import type { LiveWeather } from '@/lib/sources/openMeteo'
import type { LiveAq } from '@/lib/sources/openAQ'
import presetsData from '@/data/bangalore/presets.json'

const presets = presetsData as Record<PresetYear, Baseline>

interface SimulatorClientProps {
  baseline: Baseline
  liveWeather: LiveWeather | null
  liveAq: LiveAq | null
}

const DEFAULT_ZONE: ZoneKey = 'central'

/**
 * Coupling ratio for linked-slider mode — moving one of {canopyPct, builtUpPct}
 * pulls the other by this fraction of the delta, in the opposite direction.
 * Conservative choice: IISc LULC 1973–2023 implies 0.6–1.4 pp canopy per pp
 * built-up depending on direction; 0.6 is the low end and avoids "runaway"
 * coupling where a tiny nudge to one slider pegs the other.
 * Source: Ramachandra & Bharath 2023.
 */
const COUPLING_RATIO = 0.6

/** Slider bounds kept in sync with SliderPanel's SLIDERS config. */
const SLIDER_BOUNDS = {
  canopyPct: { min: 0, max: 80 },
  builtUpPct: { min: 0, max: 100 },
} as const

export function SimulatorClient({ baseline, liveWeather, liveAq }: SimulatorClientProps) {
  const [sliders, setSliders] = useState<SliderState>({
    canopyPct: baseline.canopyPct,
    builtUpPct: baseline.builtUpPct,
    waterKm2: baseline.waterKm2,
    vehiclesIndex: baseline.vehiclesIndex,
    populationM: baseline.populationM,
  })
  const [linkedMode, setLinkedMode] = useState(true)
  const [activePreset, setActivePreset] = useState<PresetYear | null>('2026')
  const [basemap, setBasemap] = useState<'dark' | 'satellite'>('dark')
  const [ctx, setCtx] = useState<SimContext>({
    month: 4,  // April — matches the baseline snapshot
    windDir: 'N',
    aod: 0.4,
    zone: DEFAULT_ZONE,
    timeOfDay: 'day',
  })

  const handleSliderChange = useCallback((key: keyof SliderState, value: number) => {
    setSliders(prev => {
      const next: SliderState = { ...prev, [key]: value }
      if (linkedMode && (key === 'canopyPct' || key === 'builtUpPct')) {
        const otherKey: 'canopyPct' | 'builtUpPct' =
          key === 'canopyPct' ? 'builtUpPct' : 'canopyPct'
        const delta = value - prev[key]
        const bounds = SLIDER_BOUNDS[otherKey]
        const coupled = prev[otherKey] - COUPLING_RATIO * delta
        next[otherKey] = Math.max(bounds.min, Math.min(bounds.max, coupled))
      }
      return next
    })
    setActivePreset(null)
  }, [linkedMode])

  const handleLinkedModeChange = useCallback((linked: boolean) => {
    setLinkedMode(linked)
  }, [])

  const handlePresetSelect = useCallback((year: PresetYear) => {
    const preset = presets[year]
    setSliders({
      canopyPct: preset.canopyPct,
      builtUpPct: preset.builtUpPct,
      waterKm2: preset.waterKm2,
      vehiclesIndex: preset.vehiclesIndex,
      populationM: preset.populationM,
    })
    setActivePreset(year)
  }, [])

  const handleZoneChange = useCallback((zone: ZoneKey) => {
    const z = zones[zone]
    setSliders(prev => ({
      ...prev,
      canopyPct: z.canopyPct,
      builtUpPct: z.builtUpPct,
      waterKm2: z.waterKm2,
    }))
    setCtx(prev => ({ ...prev, zone }))
    setActivePreset(null)
  }, [])

  const handleMonthChange = useCallback((month: number) => {
    setCtx(prev => ({ ...prev, month }))
  }, [])

  const handleWindDirChange = useCallback((windDir: WindDir) => {
    setCtx(prev => ({ ...prev, windDir }))
  }, [])

  const handleAodChange = useCallback((aod: number) => {
    setCtx(prev => ({ ...prev, aod }))
  }, [])

  const handleTimeOfDayChange = useCallback((timeOfDay: 'day' | 'night') => {
    setCtx(prev => ({ ...prev, timeOfDay }))
  }, [])

  const output = simulate(baseline, sliders, ctx)

  // Publish the modelled temperature to the ambient particle canvas in layout
  useAmbientTemp(output.tempC)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Heat Simulator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Adjust the sliders to explore how land-use changes affect Bangalore&apos;s
          temperature and air quality. The model applies published coefficients
          against the April 2026 baseline.
        </p>
      </div>

      {/* Live weather strip */}
      {liveWeather && <LiveWeatherStrip weather={liveWeather} liveAq={liveAq} />}

      <div className="mt-6">
        <HonestyInline />
      </div>

      {/* Climate context controls */}
      <div className="mt-6">
        <ClimateContext
          ctx={ctx}
          onMonthChange={handleMonthChange}
          onWindDirChange={handleWindDirChange}
          onAodChange={handleAodChange}
          onZoneChange={handleZoneChange}
          onTimeOfDayChange={handleTimeOfDayChange}
        />
      </div>

      {/* Hero: spatial heatmap — the main visual */}
      <div className="mt-8">
        {/* Basemap toggle */}
        <div className="mb-2 flex items-center justify-end gap-3">
          <span className="text-[11px] text-muted-foreground">
            Sentinel-2 · Q1 2024 EOX cloudless composite (latest free)
          </span>
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => setBasemap('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                basemap === 'dark'
                  ? 'bg-foreground text-background'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
              aria-pressed={basemap === 'dark'}
              title="Dark basemap"
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
            <button
              onClick={() => setBasemap('satellite')}
              className={`flex items-center gap-1.5 border-l border-border px-3 py-1.5 text-xs transition-colors ${
                basemap === 'satellite'
                  ? 'bg-foreground text-background'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
              aria-pressed={basemap === 'satellite'}
              title="Satellite basemap"
            >
              <Satellite className="h-3.5 w-3.5" />
              Satellite
            </button>
          </div>
        </div>
        <HeatmapMap baseline={baseline} sliders={sliders} ctx={ctx} basemap={basemap} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: Sliders */}
        <div className="order-2 lg:order-1">
          <SliderPanel
            sliders={sliders}
            activePreset={activePreset}
            linkedMode={linkedMode}
            onSliderChange={handleSliderChange}
            onPresetSelect={handlePresetSelect}
            onLinkedModeChange={handleLinkedModeChange}
          />
        </div>

        {/* Right: Readouts */}
        <div className="order-1 lg:order-2">
          <Readouts output={output} baseline={{ tempC: baseline.tempC, pm25: baseline.pm25 }} liveAq={liveAq} />
        </div>
      </div>

      {/* Baseline info */}
      <div className="mt-10 rounded-lg border bg-card/50 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Baseline (April 2026):</strong>{' '}
        Canopy {baseline.canopyPct}% · Built-up {baseline.builtUpPct}% ·
        Water {baseline.waterKm2} km² · Vehicles index {baseline.vehiclesIndex} ·
        Pop {baseline.populationM} M · Temp {baseline.tempC}°C · PM2.5 {baseline.pm25} µg/m³.
        Data from IISc Bangalore, KSPCB, and Open-Meteo ERA5 April 2026 analysis.
      </div>
    </div>
  )
}
