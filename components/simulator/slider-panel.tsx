'use client'

import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
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
    description: 'Percentage of Bangalore covered by tree canopy. 1973: 68%, 2026: 6%.',
  },
  {
    key: 'builtUpPct',
    label: 'Built-up Area',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    source: 'builtUp',
    description: 'Percentage of Bangalore covered by impervious surfaces. 1973: 8%, 2026: 93%.',
  },
  {
    key: 'waterKm2',
    label: 'Water Bodies',
    min: 0,
    max: 30,
    step: 0.5,
    unit: ' km²',
    source: 'water',
    description: 'Total area of lakes, tanks, and wetlands. 1973: 21 km², 2026: 4.5 km².',
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
  onSliderChange: (key: keyof SliderState, value: number) => void
  onPresetSelect: (year: PresetYear) => void
}

export function SliderPanel({
  sliders,
  activePreset,
  onSliderChange,
  onPresetSelect,
}: SliderPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Preset buttons */}
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
