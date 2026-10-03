import type { ModelOutput } from '@/cities/types'
import type { LiveAq } from '@/lib/sources/openAQ'
import { coefficients } from '@/model/coefficients'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface ReadoutsProps {
  cityId: string
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
    description: 'Demo daytime aerosol response relative to the reference AOD. This is not a calibrated local air-temperature coefficient.',
    source: 'Mechanism context: Babu et al., ARFI 2013; exact magnitude unverified.',
  },
  aerosolNight: {
    label: 'Aerosol (night)',
    description: 'Demo nighttime aerosol response relative to the reference AOD. This is not a calibrated local air-temperature coefficient.',
    source: 'Mechanism context: Babu et al., ARFI 2013; exact magnitude unverified.',
  },
  monsoon: {
    label: 'Season/monsoon',
    description: 'Assumed monthly response relative to the April reference setting. This does not simulate monsoon dynamics.',
    source: 'City response table; derivation and applicability unverified.',
  },
  advection: {
    label: 'Wind advection',
    description: 'Multiplier applied to the slider-driven subtotal based on wind direction — magnitude depends on which land-use axis the wind crosses.',
    source: 'Demonstration multiplier; no verified local calibration.',
  },
  zoneOffset: {
    label: 'Zone offset',
    description: 'Assumed zone response relative to the reference zone. It is not observed local air or surface temperature.',
    source: 'Curated zone assumptions; no verified magnitude derivation.',
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
              <p className="mt-1 text-muted-foreground">Context / assumption status: {info.source}</p>
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

export function Readouts({ output, baseline, liveAq, cityId }: ReadoutsProps) {
  const breakdownEntries = Object.entries(output.breakdown) as [
    keyof typeof output.breakdown,
    number,
  ][]

  const relevantBreakdown = breakdownEntries.filter(([, val]) => val !== 0)

  const rangedBreakdownBands = output.bands.breakdown

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Temperature */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Temperature-equivalent response
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
                <span className="sr-only">Temperature methodology</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Demo assumptions (unverified magnitudes). Canopy: {coefficients.canopy.central}°C per −1 pp · Built-up:{' '}
              {coefficients.builtUp.central}°C per +1 pp · Water:{' '}
              {coefficients.water.central}°C per −1 km²
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-5xl font-bold tabular-nums tracking-tight text-orange-400">
            {formatSigned(output.tempDelta, 1)}
            <span className="text-3xl">°C</span>
          </span>
          <div className="mb-1 flex flex-col">
            <span className="text-xs text-muted-foreground">Selected sensitivity range</span>
            <BandLine
              low={output.bands.tempDelta.low}
              high={output.bands.tempDelta.high}
              unit="°C"
              digits={2}
            />
            <span className="text-xs text-muted-foreground">
              from the reference scenario
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Not measured or predicted air temperature or land-surface temperature. Demo anchor + response: {output.tempC.toFixed(1)}°C (anchor {baseline.tempC.toFixed(1)}°C).</p>
        {(output.diagnostics.temperature.clipped || output.diagnostics.temperature.sensitivityClipped) && <div className="mt-3 rounded border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
          <strong>Numerical limit reached.</strong> The displayed response is limited to −8…+12°C. Before clipping: {formatSigned(output.diagnostics.temperature.unclippedDelta, 2)}°C; selected range {formatSigned(output.diagnostics.temperature.unclippedLow, 2)}…{formatSigned(output.diagnostics.temperature.unclippedHigh, 2)}°C.
          {output.diagnostics.temperature.collapsedByClipping && ' The range collapsed at the limit; this is not certainty or validation.'}
          <p className="mt-1">Clipping can hide additional response. Components below are shown before the limit is applied.</p>
        </div>}
        {output.nightCoolLoss !== 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Assumed canopy night-response proxy:{' '}
            <span className="text-amber-300">
              {output.nightCoolLoss > 0 ? '+' : ''}{output.nightCoolLoss.toFixed(2)}°C
            </span>{' '}
            <span className="font-mono text-[11px] text-muted-foreground/70">
              [{formatSigned(Math.min(output.bands.nightCoolLoss.low, output.bands.nightCoolLoss.high), 2)}…
              {formatSigned(Math.max(output.bands.nightCoolLoss.low, output.bands.nightCoolLoss.high), 2)}]°C
            </span>{' '}
            (separate proxy, not observed nighttime cooling)
          </p>
        )}

        {(output.diagnostics.nightCoolLoss.clipped || output.diagnostics.nightCoolLoss.sensitivityClipped) && <p className="mt-2 text-xs text-amber-200">
          The canopy night-response proxy reaches its numerical limit. Before clipping: {formatSigned(output.diagnostics.nightCoolLoss.unclippedValue, 2)}°C; selected range {formatSigned(output.diagnostics.nightCoolLoss.unclippedLow, 2)}…{formatSigned(output.diagnostics.nightCoolLoss.unclippedHigh, 2)}°C.
          {output.diagnostics.nightCoolLoss.collapsedByClipping && ' A collapsed range is not certainty.'}
        </p>}

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
            Illustrative PM2.5 scenario
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
                <span className="sr-only">PM2.5 methodology</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Demo vehicles assumption: {coefficients.vehicles.central} µg/m³ per +10 index points ·{' '}
              {coefficients.vehicles.source}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-5xl font-bold tabular-nums tracking-tight text-purple-400">
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
              vs {baseline.pm25} µg/m³ reference anchor
            </span>
            {liveAq && (
              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                External station report: {liveAq.valueUgm3} µg/m³
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Illustrative scenario with unverified response magnitudes; not a measurement or air-quality forecast.
        </p>
      </div>

      {(output.diagnostics.pm25.clipped || output.diagnostics.pm25.sensitivityClipped) && <div className="rounded border border-amber-500/30 p-3 text-xs text-amber-200 md:col-span-2">
        <strong>PM2.5 numerical limit reached.</strong> Displayed values are limited to 0…500 µg/m³. Before clipping: {output.diagnostics.pm25.unclippedValue.toFixed(2)} µg/m³; selected range {output.diagnostics.pm25.unclippedLow.toFixed(2)}…{output.diagnostics.pm25.unclippedHigh.toFixed(2)} µg/m³.
        {output.diagnostics.pm25.collapsedByClipping && ' The range collapsed at the limit; this is not certainty or validation.'}
      </div>}
      {/* Sensitivity note */}
      <p className="text-xs text-muted-foreground md:col-span-2">
        Brackets show selected sensitivity ranges, not confidence intervals or full scientific uncertainty. Demo assumption ranges are listed in{' '}
        <a href={`/${cityId}/about`} className="underline underline-offset-2 hover:text-foreground">the model and source notes</a>:
        canopy {coefficients.canopy.low}–{coefficients.canopy.high}°C/pp ·
        built-up {coefficients.builtUp.low}–{coefficients.builtUp.high}°C/pp ·
        water {coefficients.water.low}–{coefficients.water.high}°C/km² ·
        vehicles {coefficients.vehicles.low}–{coefficients.vehicles.high} µg/m³ per +10 index points.
      </p>
    </div>
  )
}
