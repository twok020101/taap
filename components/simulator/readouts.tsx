import type { ModelOutput } from '@/cities/types'
import type { LiveAq } from '@/lib/sources/openAQ'
import { coefficients } from '@/model/coefficients'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface ReadoutsProps {
  output: ModelOutput
  baseline: { tempC: number; pm25: number }
  liveAq?: LiveAq | null
}

function DeltaTag({ delta, unit }: { delta: number; unit: string }) {
  const isPositive = delta > 0
  const isZero = delta === 0
  const color = isZero
    ? 'text-muted-foreground'
    : isPositive
    ? 'text-red-400'
    : 'text-emerald-400'
  const sign = isPositive ? '+' : ''
  return (
    <span className={`text-sm font-medium ${color}`}>
      {sign}{delta.toFixed(1)}{unit}
    </span>
  )
}

function formatSigned(value: number, digits: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}`
}

function BandLine({
  low,
  high,
  unit,
  digits,
}: {
  low: number
  high: number
  unit: string
  digits: number
}) {
  const [lo, hi] = low <= high ? [low, high] : [high, low]
  return (
    <span className="text-[11px] font-mono text-muted-foreground">
      [{formatSigned(lo, digits)} … {formatSigned(hi, digits)}]{unit}
    </span>
  )
}

interface BreakdownSource {
  label: string
  description: string
  source: string
}

/**
 * Per-breakdown-row tooltip copy. Ranged rows (canopy/builtUp/water/vehicles)
 * pull description+source directly from `coefficients`. Fixed-value rows
 * (aerosol/monsoon/advection/zone) have their citations inlined here.
 */
const BREAKDOWN_INFO: Record<string, BreakdownSource> = {
  canopy: {
    label: 'Canopy',
    description: coefficients.canopy.description,
    source: coefficients.canopy.source,
  },
  builtUp: {
    label: 'Built-up',
    description: coefficients.builtUp.description,
    source: coefficients.builtUp.source,
  },
  water: {
    label: 'Water bodies',
    description: coefficients.water.description,
    source: coefficients.water.source,
  },
  aerosolDay: {
    label: 'Aerosol (day)',
    description: 'Solar dimming from aerosols — cooling at ground level. −0.8°C per +0.3 AOD above the 0.4 reference.',
    source: 'Babu et al., ARFI 2013',
  },
  aerosolNight: {
    label: 'Aerosol (night)',
    description: 'IR trapping from aerosols — warming at ground level after sunset. +0.5°C per +0.3 AOD above the 0.4 reference.',
    source: 'Babu et al., ARFI 2013',
  },
  monsoon: {
    label: 'Season/monsoon',
    description: 'Monthly offset from annual mean, capturing seasonal variation and monsoon cooling.',
    source: 'IMD climatology Bangalore 1991–2020',
  },
  advection: {
    label: 'Wind advection',
    description: 'Multiplier applied to the slider-driven subtotal based on wind direction — east pulls hot IT-corridor air, west pulls cooler green-belt air.',
    source: 'KSPCB wind-rose 2022 + zone land-use analysis',
  },
  zoneOffset: {
    label: 'Zone offset',
    description: 'Residual zone-specific LST not captured by aggregate sliders. Central CBD runs hotter than the city mean; outskirts cooler.',
    source: 'IISc Ramachandra & Bharath 2023; IISc LST maps',
  },
}

interface BreakdownRowProps {
  breakdownKey: string
  value: number
  band?: { low: number; high: number }
}

function BreakdownRow({ breakdownKey, value, band }: BreakdownRowProps) {
  if (value === 0) return null
  const info = BREAKDOWN_INFO[breakdownKey]
  const isPositive = value > 0
  const color = isPositive ? 'text-red-400' : 'text-emerald-400'
  const sign = isPositive ? '+' : ''
  const label = info?.label ?? breakdownKey

  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{label}</span>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-3 w-3" />
                <span className="sr-only">About {label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-xs">
              <p>{info.description}</p>
              <p className="mt-1 text-muted-foreground">Source: {info.source}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2">
        {band && (
          <span className="text-[11px] font-mono text-muted-foreground/70">
            [{formatSigned(Math.min(band.low, band.high), 2)}…{formatSigned(Math.max(band.low, band.high), 2)}]
          </span>
        )}
        <span className={`font-mono text-xs font-medium ${color}`}>
          {sign}{value.toFixed(2)}°C
        </span>
      </div>
    </li>
  )
}

export function Readouts({ output, baseline, liveAq }: ReadoutsProps) {
  const breakdownEntries = Object.entries(output.breakdown) as [
    keyof typeof output.breakdown,
    number,
  ][]

  const relevantBreakdown = breakdownEntries.filter(([, val]) => val !== 0)

  const rangedBreakdownBands = output.bands.breakdown

  return (
    <div className="flex flex-col gap-4">
      {/* Temperature */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Modelled Temperature
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
                <span className="sr-only">Temperature methodology</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Canopy: {coefficients.canopy.central}°C per −1 pp · Built-up:{' '}
              {coefficients.builtUp.central}°C per +1 pp · Water:{' '}
              {coefficients.water.central}°C per −1 km²
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-6xl font-bold tabular-nums tracking-tight text-orange-400">
            {output.tempC.toFixed(1)}
            <span className="text-3xl">°C</span>
          </span>
          <div className="mb-1 flex flex-col">
            <DeltaTag delta={output.tempDelta} unit="°C" />
            <BandLine
              low={output.bands.tempDelta.low}
              high={output.bands.tempDelta.high}
              unit="°C"
              digits={2}
            />
            <span className="text-xs text-muted-foreground">
              vs {baseline.tempC.toFixed(1)}°C baseline
            </span>
          </div>
        </div>
        {output.nightCoolLoss !== 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Night cooling loss:{' '}
            <span className="text-amber-300">
              {output.nightCoolLoss > 0 ? '+' : ''}{output.nightCoolLoss.toFixed(2)}°C
            </span>{' '}
            <span className="font-mono text-[11px] text-muted-foreground/70">
              [{formatSigned(Math.min(output.bands.nightCoolLoss.low, output.bands.nightCoolLoss.high), 2)}…
              {formatSigned(Math.max(output.bands.nightCoolLoss.low, output.bands.nightCoolLoss.high), 2)}]°C
            </span>{' '}
            (reduced evapotranspiration)
          </p>
        )}

        {/* Breakdown */}
        {relevantBreakdown.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Where this delta came from:
            </p>
            <ul className="flex flex-col gap-1.5 text-xs">
              {relevantBreakdown.map(([key, val]) => {
                const band =
                  key === 'canopy'
                    ? rangedBreakdownBands.canopy
                    : key === 'builtUp'
                    ? rangedBreakdownBands.builtUp
                    : key === 'water'
                    ? rangedBreakdownBands.water
                    : undefined
                return (
                  <BreakdownRow
                    key={key}
                    breakdownKey={key}
                    value={val}
                    band={band}
                  />
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* PM2.5 */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Modelled PM2.5
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
                <span className="sr-only">PM2.5 methodology</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Vehicles index: {coefficients.vehicles.central} µg/m³ per +10 pp ·{' '}
              {coefficients.vehicles.source}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-6xl font-bold tabular-nums tracking-tight text-purple-400">
            {output.pm25}
            <span className="text-2xl font-normal text-muted-foreground"> µg/m³</span>
          </span>
          <div className="mb-1 flex flex-col gap-0.5">
            <DeltaTag delta={output.pm25Delta} unit=" µg/m³" />
            <BandLine
              low={output.bands.pm25Delta.low}
              high={output.bands.pm25Delta.high}
              unit=" µg/m³"
              digits={1}
            />
            <span className="text-xs text-muted-foreground">
              vs {baseline.pm25} µg/m³ baseline
            </span>
            {liveAq && (
              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                live: {liveAq.valueUgm3} µg/m³
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          WHO guideline: 15 µg/m³ (annual mean)
        </p>
      </div>

      {/* Uncertainty note */}
      <p className="text-xs text-muted-foreground">
        Brackets show the low–high band from the coefficient ranges in{' '}
        <a href="/about" className="underline underline-offset-2 hover:text-foreground">peer-reviewed sources</a>:
        canopy {coefficients.canopy.low}–{coefficients.canopy.high}°C/pp ·
        built-up {coefficients.builtUp.low}–{coefficients.builtUp.high}°C/pp ·
        water {coefficients.water.low}–{coefficients.water.high}°C/km² ·
        vehicles {coefficients.vehicles.low}–{coefficients.vehicles.high} µg/m³ per +10 pp.
      </p>
    </div>
  )
}
