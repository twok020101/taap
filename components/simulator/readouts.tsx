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

const BREAKDOWN_LABELS: Record<string, string> = {
  canopy: 'Canopy',
  builtUp: 'Built-up',
  water: 'Water bodies',
  aerosolDay: 'Aerosol (day)',
  aerosolNight: 'Aerosol (night)',
  monsoon: 'Season/monsoon',
  advection: 'Wind advection',
  zoneOffset: 'Zone offset',
}

interface BreakdownRowProps {
  label: string
  value: number
}

function BreakdownRow({ label, value }: BreakdownRowProps) {
  if (value === 0) return null
  const isPositive = value > 0
  const color = isPositive ? 'text-red-400' : 'text-emerald-400'
  const sign = isPositive ? '+' : ''
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-medium ${color}`}>
        {sign}{value.toFixed(2)}°C
      </span>
    </li>
  )
}

export function Readouts({ output, baseline, liveAq }: ReadoutsProps) {
  const breakdownEntries = Object.entries(output.breakdown) as [
    keyof typeof output.breakdown,
    number,
  ][]

  // Only show day or night aerosol, not both
  const relevantBreakdown = breakdownEntries.filter(([key, val]) => {
    // Skip zero values
    if (val === 0) return false
    // Skip aerosolNight if it's the same sign as aerosolDay — show the relevant one
    // Actually show both (they're different); filter is just for zeros
    return true
  })

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
              {relevantBreakdown.map(([key, val]) => (
                <BreakdownRow
                  key={key}
                  label={BREAKDOWN_LABELS[key] ?? key}
                  value={val}
                />
              ))}
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
        Ranges: canopy {coefficients.canopy.low}–{coefficients.canopy.high}°C/pp ·
        built-up {coefficients.builtUp.low}–{coefficients.builtUp.high}°C/pp ·
        water {coefficients.water.low}–{coefficients.water.high}°C/km² ·
        vehicles {coefficients.vehicles.low}–{coefficients.vehicles.high} µg/m³ per +10 pp.
        Monte Carlo uncertainty bands in v0.2.
      </p>
    </div>
  )
}
