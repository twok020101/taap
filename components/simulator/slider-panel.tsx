'use client'

import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Link2, Link2Off } from 'lucide-react'
import type { SliderState, PresetYear } from '@/cities/types'
import { coefficients } from '@/model/coefficients'

interface SliderConfig {
  key: keyof SliderState
  label: string
  min: number
  max: number
  step: number
  unit: string
  source: keyof typeof coefficients | null
  description: string
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'canopyPct',
    label: 'Tree Canopy',
    min: 0,
    max: 80,
    step: 1,
    unit: '%',
    source: 'canopy',
    description: 'Percentage of the city covered by tree canopy.',
  },
  {
    key: 'builtUpPct',
    label: 'Built-up Area',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    source: 'builtUp',
    description: 'Percentage of the city covered by impervious surfaces.',
  },
  {
    key: 'waterKm2',
    label: 'Water Bodies',
    min: 0,
    max: 30,
    step: 0.5,
    unit: ' km²',
    source: 'water',
    description: 'Total area of lakes, tanks, and wetlands within city bounds.',
  },
  {
    key: 'vehiclesIndex',
    label: 'Vehicles Index',
    min: 0,
    max: 150,
    step: 1,
    unit: '',
    source: 'vehicles',
    description: 'Fleet size index relative to 2026 (100 = current). Drives PM2.5.',
  },
  {
    key: 'populationM',
    label: 'Population',
    min: 0.5,
    max: 20,
    step: 0.1,
    unit: ' M',
    source: null,
    description: 'Population in millions. Informational — does not enter the temperature formula directly.',
  },
]

const PRESETS: { label: string; year: PresetYear }[] = [
  { label: '1973', year: '1973' },
  { label: '2000', year: '2000' },
  { label: '2024', year: '2024' },
  { label: '2026 (now)', year: '2026' },
]

interface SliderPanelProps {
  sliders: SliderState
  activePreset: PresetYear | null
  linkedMode: boolean
  onSliderChange: (key: keyof SliderState, value: number) => void
  onPresetSelect: (year: PresetYear) => void
  onLinkedModeChange: (linked: boolean) => void
}

const LINK_EXPLANATION =
  'When linked, moving built-up pulls canopy down by 0.6× the delta (and vice versa), mirroring how impervious surface historically replaces vegetation (IISc LULC 1973–2023, calibrated on Bangalore). Unlinked lets you explore counterfactuals — e.g. canopy gain without built-up loss.'

export function SliderPanel({
  sliders,
  activePreset,
  linkedMode,
  onSliderChange,
  onPresetSelect,
  onLinkedModeChange,
}: SliderPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Preset buttons + linked-mode toggle */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Historical Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ label, year }) => (
              <Button
                key={year}
                variant={activePreset === year ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPresetSelect(year)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Slider mode
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant={linkedMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => onLinkedModeChange(true)}
              className="gap-1.5"
              aria-pressed={linkedMode}
            >
              <Link2 className="h-3.5 w-3.5" />
              Linked
            </Button>
            <Button
              variant={!linkedMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => onLinkedModeChange(false)}
              className="gap-1.5"
              aria-pressed={!linkedMode}
            >
              <Link2Off className="h-3.5 w-3.5" />
              Free
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                  <span className="sr-only">About linked mode</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-xs">
                {LINK_EXPLANATION}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-5">
        {SLIDERS.map(({ key, label, min, max, step, unit, source, description }) => {
          const value = sliders[key]
          const coeff = source && source !== null ? coefficients[source as keyof typeof coefficients] : null

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Info className="h-3 w-3" />
                        <span className="sr-only">About {label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64 text-xs">
                      <p>{description}</p>
                      {coeff && typeof coeff === 'object' && 'source' in coeff && (
                        <p className="mt-1 text-muted-foreground">
                          Source: {(coeff as { source: string }).source}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {typeof value === 'number' && !Number.isInteger(value)
                    ? value.toFixed(1)
                    : value}
                  {unit}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-right text-xs text-muted-foreground">
                  {min}{unit}
                </span>
                <Slider
                  min={min}
                  max={max}
                  step={step}
                  value={[value as number]}
                  onValueChange={([v]) => onSliderChange(key, v)}
                  className="flex-1"
                />
                <span className="w-10 text-xs text-muted-foreground">
                  {max}{unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
