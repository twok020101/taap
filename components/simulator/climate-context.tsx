'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import type { CityConfig, SimContext, ZoneKey, WindDir } from '@/cities/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

const MONTHS = [
  { label: 'Jan', value: 1 },
  { label: 'Feb', value: 2 },
  { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 },
  { label: 'May', value: 5 },
  { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 },
  { label: 'Aug', value: 8 },
  { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 },
  { label: 'Nov', value: 11 },
  { label: 'Dec', value: 12 },
]

const WIND_DIRS: { label: string; value: WindDir; arrow: string }[] = [
  { label: 'N', value: 'N', arrow: '↑' },
  { label: 'E', value: 'E', arrow: '→' },
  { label: 'S', value: 'S', arrow: '↓' },
  { label: 'W', value: 'W', arrow: '←' },
]

interface ClimateContextProps {
  city: CityConfig
  ctx: SimContext
  onMonthChange: (month: number) => void
  onWindDirChange: (dir: WindDir) => void
  onAodChange: (aod: number) => void
  onZoneChange: (zone: ZoneKey) => void
  onTimeOfDayChange: (tod: 'day' | 'night') => void
}

export function ClimateContext({
  city,
  ctx,
  onMonthChange,
  onWindDirChange,
  onAodChange,
  onZoneChange,
  onTimeOfDayChange,
}: ClimateContextProps) {
  const zoneKeys = Object.keys(city.zones)
  const [open, setOpen] = useState(true)

  const aodLabel =
    ctx.aod <= 0.35 ? 'Low (clean)'
    : ctx.aod <= 0.6 ? 'Medium'
    : 'High (polluted)'

  return (
    <div className="rounded-lg border bg-card">
      {/* Header / toggle */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 transition-colors rounded-t-lg"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>Climate context</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="flex flex-col gap-6 border-t px-4 py-5">

          {/* Month / season */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Month (captures monsoon)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map(({ label, value }) => (
                <Button
                  key={value}
                  variant={ctx.month === value ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-10 px-0 text-xs"
                  onClick={() => onMonthChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Source: IMD climatology {city.name} 1991–2020
            </p>
          </div>

          {/* Wind direction */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Wind direction (advection)
            </p>
            <div className="flex flex-wrap gap-2">
              {WIND_DIRS.map(({ label, value, arrow }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onWindDirChange(value)}
                  className={[
                    'flex flex-col items-center gap-0.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                    ctx.windDir === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50',
                  ].join(' ')}
                >
                  <span className="text-base leading-none">{arrow}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Source: State PCB wind-rose + zone land-use ({city.name})
            </p>
          </div>

          {/* AOD slider */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Aerosol load (AOD)
              </p>
              <span className="text-xs font-mono text-muted-foreground">
                {ctx.aod.toFixed(2)} — {aodLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">0.1</span>
              <Slider
                min={0.1}
                max={1.0}
                step={0.05}
                value={[ctx.aod]}
                onValueChange={([v]) => onAodChange(v)}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-6">1.0</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>Med</span>
              <span>High</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Source: Babu et al., ARFI 2013 — Indian urban AOD-forcing.
              Day: −0.8°C / +0.3 AOD · Night: +0.5°C / +0.3 AOD · PM2.5: +30 µg/m³ / +0.3 AOD
            </p>
          </div>

          {/* Zone selector */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Zone (spatial heterogeneity)
            </p>
            <div className="flex flex-wrap gap-2">
              {zoneKeys.map(key => (
                <Button
                  key={key}
                  variant={ctx.zone === key ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto whitespace-normal py-1 text-xs"
                  onClick={() => onZoneChange(key)}
                >
                  {city.zones[key].label}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Selecting a zone resets sliders to that zone&apos;s baseline.
            </p>
          </div>

          {/* Time of day */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Time of day (aerosol forcing)
            </p>
            <div className="flex gap-2">
              {(['day', 'night'] as const).map(tod => (
                <Button
                  key={tod}
                  variant={ctx.timeOfDay === tod ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTimeOfDayChange(tod)}
                >
                  {tod === 'day' ? '☀ Day' : '☾ Night'}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Switches aerosol forcing sign: day = cooling (solar dimming), night = warming (IR trapping).
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
