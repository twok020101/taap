'use client'

import Link from 'next/link'
import { Droplets, Footprints, TreePine, Wind } from 'lucide-react'
import type { Baseline, CityConfig, SimContext, SliderState } from '@/cities/types'
import { compareScenario, signed } from '@/lib/scenarios'

export function EnvironmentalImpact({ city, baseline, sliders, ctx }: { city: CityConfig; baseline: Baseline; sliders: SliderState; ctx: SimContext }) {
  const comparison = compareScenario(city, baseline, baseline, sliders, ctx)
  const canopy = sliders.canopyPct - baseline.canopyPct
  const built = sliders.builtUpPct - baseline.builtUpPct
  const water = sliders.waterKm2 === null || baseline.waterKm2 === null ? null : sliders.waterKm2 - baseline.waterKm2
  const vehicles = sliders.vehiclesIndex - baseline.vehiclesIndex
  const effects = [
    { icon: TreePine, title: 'Shade on the street', change: `${signed(canopy)} pp canopy`, text: canopy > 0 ? 'More canopy creates opportunities for shade. Tree placement and maturity determine who benefits.' : canopy < 0 ? 'Less canopy leaves more surfaces exposed to sunlight. The model does not locate lost shade on individual streets.' : 'Canopy is unchanged from the city baseline.', slug: 'tree-canopy' },
    { icon: Footprints, title: 'Heat in the ground', change: `${signed(built)} pp built-up`, text: built > 0 ? 'More built-up area can increase heat storage and reduce space for living soil.' : built < 0 ? 'Less built-up area creates space for soil and vegetation; the replacement surface matters.' : 'Built-up area is unchanged. Surface materials and drainage are not simulated.', slug: 'surface-aware-greening' },
    { icon: Droplets, title: 'Space for water', change: water === null ? 'Water data unavailable' : `${signed(water)} km² water`, text: water === null ? 'No water-area effect is calculated for this city. Missing evidence is not a zero-water baseline.' : water > 0 ? 'More water area can support local evaporative cooling. Humidity, water quality and seasonal supply matter.' : water < 0 ? 'Less water area reduces the model’s local cooling contribution. Flood risk is not calculated.' : 'Water area is unchanged. Groundwater, runoff and habitat benefits are not quantified.', slug: 'blue-green-infrastructure' },
    { icon: Wind, title: 'Particles in the air', change: `${signed(vehicles)} vehicle-index points`, text: vehicles < 0 ? 'A lower vehicle index reduces modelled PM2.5. It does not calculate carbon savings or direct cooling.' : vehicles > 0 ? 'A higher vehicle index increases modelled PM2.5. Exhaust, road dust and fleet composition need local evidence.' : 'The vehicle index is unchanged. Pollution also depends on weather and other emissions sources.', slug: 'cleaner-transport' },
  ]
  return <section aria-labelledby="environment-impact-title" className="mt-8 overflow-hidden rounded-xl border border-emerald-200/20 bg-emerald-950/10">
    <div className="grid gap-6 border-b border-border p-6 md:grid-cols-[1fr_1.1fr]">
      <div><p className="eyebrow">Beyond a number</p><h2 id="environment-impact-title" className="mt-2 font-display text-3xl italic">What changes in the environment?</h2><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Compared with {city.name}’s baseline land cover and vehicles, keeping the selected month, wind, aerosol level, zone and time of day identical in both runs.</p></div>
      <div className="grid grid-cols-2 gap-4" aria-live="polite" aria-atomic="true">{[
        { title: 'Illustrative heat change', band: comparison.temp, unit: '°C' },
        { title: 'Illustrative PM2.5 change', band: comparison.pm25, unit: 'µg/m³' },
      ].map(({ title, band, unit }) => <div key={title}><p className="text-xs text-muted-foreground">{title}</p><p className={`mt-2 font-mono text-2xl ${band.value < 0 ? 'text-emerald-200' : band.value > 0 ? 'text-orange-200' : 'text-foreground'}`}>{signed(band.value)} <span className="text-xs">{unit}</span></p><p className="mt-2 font-mono text-[10px] text-muted-foreground">[{signed(band.low)} to {signed(band.high)} {unit}]</p></div>)}</div>
    </div>
    <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">{effects.map(({ icon: Icon, title, change, text, slug }) => <div key={title}><Icon size={20} className="text-emerald-200"/><h3 className="mt-3 text-sm">{title}</h3><p className="mt-2 font-mono text-[11px] text-amber-200">{change}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{text}</p><Link href={`/research/${slug}`} className="mt-3 inline-block text-xs text-emerald-200 underline underline-offset-4">Evidence & limits</Link></div>)}</div>
    <p className="border-t border-border px-6 py-4 text-xs leading-relaxed text-muted-foreground">Ranges reflect selected model coefficients, not full scientific uncertainty. Shade, infiltration and habitat are qualitative mechanisms here; health, carbon and biodiversity outcomes are not estimated. <Link href={`/${city.id}/about`} className="underline underline-offset-4">Inspect model assumptions</Link>.</p>
  </section>
}
