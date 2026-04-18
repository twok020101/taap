'use client'

import { useState, useCallback } from 'react'
import { useAmbientTemp } from '@/components/ambient/ambient-particles'
import { SliderPanel } from '@/components/simulator/slider-panel'
import { Readouts } from '@/components/simulator/readouts'
import { MapPlaceholder } from '@/components/simulator/map-placeholder'
import { HonestyInline } from '@/components/simulator/honesty-inline'
import { ClimateContext } from '@/components/simulator/climate-context'
import { LiveWeatherStrip } from '@/components/simulator/live-weather-strip'
import { simulate } from '@/model/simulate'
import { zones } from '@/data/bangalore/zones'
import type { SliderState, PresetYear, Baseline, SimContext, ZoneKey, WindDir } from '@/cities/types'
import type { LiveWeather } from '@/lib/sources/openMeteo'
import presetsData from '@/data/bangalore/presets.json'

const presets = presetsData as Record<PresetYear, Baseline>

interface SimulatorClientProps {
  baseline: Baseline
  liveWeather: LiveWeather | null
}

const DEFAULT_ZONE: ZoneKey = 'central'

export function SimulatorClient({ baseline, liveWeather }: SimulatorClientProps) {
  const [sliders, setSliders] = useState<SliderState>({
    canopyPct: baseline.canopyPct,
    builtUpPct: baseline.builtUpPct,
    waterKm2: baseline.waterKm2,
    vehiclesIndex: baseline.vehiclesIndex,
    populationM: baseline.populationM,
  })
  const [activePreset, setActivePreset] = useState<PresetYear | null>('2026')
  const [ctx, setCtx] = useState<SimContext>({
    month: 4,  // April — matches the baseline snapshot
    windDir: 'N',
    aod: 0.4,
    zone: DEFAULT_ZONE,
    timeOfDay: 'day',
  })

  const handleSliderChange = useCallback((key: keyof SliderState, value: number) => {
    setSliders(prev => ({ ...prev, [key]: value }))
    setActivePreset(null)
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
      {liveWeather && <LiveWeatherStrip weather={liveWeather} />}

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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: Sliders */}
        <div className="order-2 lg:order-1">
          <SliderPanel
            sliders={sliders}
            activePreset={activePreset}
            onSliderChange={handleSliderChange}
            onPresetSelect={handlePresetSelect}
          />
        </div>

        {/* Right: Readouts + Map */}
        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <Readouts output={output} baseline={{ tempC: baseline.tempC, pm25: baseline.pm25 }} />
          <MapPlaceholder />
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
