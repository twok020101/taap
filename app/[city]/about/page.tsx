import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { coefficients } from '@/model/coefficients'
import { simulate } from '@/model/simulate'
import { getBaseline, getBaselineProvenance, getReferenceContext } from '@/lib/baselines'
import audit from '@/data/evidence/audit.json'
import { getCity } from '@/cities'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { pageMetadata, breadcrumbs } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
import type { Baseline, PresetYear } from '@/cities/types'
import { AlertTriangle, BookOpen, Microscope, Ruler, TrendingUp } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city)
  if (!city) notFound()
  return pageMetadata(`${city.name} heat demo methodology, assumptions & limitations | Taap`, `Inspect ${city.name}'s illustrative temperature-equivalent response, mixed-year inputs, clipping and evidence gaps. This is not a calibrated air-temperature or LST forecast.`, `/${city.id}/about`, `/${city.id}/opengraph-image`)
}

const MISSING = [
  ['Calibration and complete uncertainty', 'No independent, held-out validation links these output magnitudes to a common physical temperature metric. Low/high values vary selected assumptions only. Measurement error, structural error, geography and coefficient applicability are not included. A zero-width interval is not certainty.'],
  ['Street-scale conditions', 'Individual tree shade, building geometry, thermal comfort, soil moisture, boundary-layer dynamics and cloud feedbacks are absent. Air temperature and land surface temperature (LST) cannot be substituted for each other.'],
  ['Seasonal and transport dynamics', 'Monthly profiles, four-direction wind multipliers and AOD slopes are demonstration assumptions. They do not resolve monsoons, sea breezes, aerosol composition or transported pollution. City-specific overrides remain unverified, including mismatched source temperature statistics.'],
  ['Future climate and human exposure', 'Presets change inputs, not the model year or future climate trajectory. Population is context only. Vehicle heat, industrial heat, air-conditioning heat and health risk are not calculated. Simulated PM2.5-equivalent values are not observations or exposure guidance.'],
]

interface AnnualRow { y: number; tmaxMean: number; tminMean: number; nDays: number }
interface TempHistory {
  annual: AnnualRow[]
  baseline1951_1980: { tmaxMean: number; tminMean: number }
  recent2015_2024: { tmaxMean: number; tminMean: number }
  anomalyDegC: { tmax: number; tmin: number }
  meta: { lat: number; lon: number; fetchedAt: string }
}

function historyPaths(annual: AnnualRow[]) {
  const min = Math.floor(Math.min(...annual.map(r => r.tminMean)) - 0.5)
  const max = Math.ceil(Math.max(...annual.map(r => r.tmaxMean)) + 0.5)
  const x = (year: number) => 44 + (year - annual[0].y) / (annual.at(-1)!.y - annual[0].y) * 742
  const y = (value: number) => 14 + (max - value) / (max - min) * 218
  const line = (key: 'tmaxMean' | 'tminMean') => annual.map(row => `${x(row.y).toFixed(1)},${y(row[key]).toFixed(1)}`).join(' ')
  const ticks: number[] = []
  for (let value = Math.ceil(min / 2) * 2; value <= max; value += 2) ticks.push(value)
  return { x, y, ticks, tmax: line('tmaxMean'), tmin: line('tminMean') }
}

export async function generateStaticParams() {
  const { cityIds } = await import('@/cities')
  return cityIds.map(city => ({ city }))
}

export default async function AboutPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: cityId } = await params
  const city = getCity(cityId)
  const baseline = getBaseline(cityId)
  const provenance = getBaselineProvenance(cityId)
  if (!city || !baseline || !provenance) notFound()
  const [presetsModule, historyModule] = await Promise.all([
    import(`@/data/${cityId}/presets.json`),
    import(`@/data/${cityId}/temperature-history.json`),
  ])
  const presets = presetsModule.default as Record<PresetYear, Baseline>
  const history = historyModule.default as TempHistory
  const reference = getReferenceContext(city)
  const diagnostic = simulate(city, baseline, presets['1973'], reference)
  const raw = diagnostic.diagnostics.temperature
  const paths = historyPaths(history.annual)
  const kindLabel = { observed: 'Reported observation', estimated: 'Estimated / derived', assumed: 'Assumed', unavailable: 'Unavailable' }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <StructuredData data={breadcrumbs([{ name: 'Taap', path: '/' }, { name: city.name, path: `/${city.id}` }, { name: 'Methodology', path: `/${city.id}/about` }])} />
      <header className="mb-10">
        <Badge variant="outline" className="mb-4">Model honesty · {city.name}</Badge>
        <h1 className="text-4xl font-bold tracking-tight">What the demo calculates</h1>
        <p className="mt-4 text-lg text-muted-foreground">An illustrative temperature-equivalent response, not a calibrated air-temperature or land-surface-temperature (LST) forecast.</p>
        <p className="mt-3 text-sm text-muted-foreground">The deterministic code demonstrates scenario comparison and sensitivity analysis. Numerical coefficients are demonstration assumptions. Scientific calibration would require matched measurements, geography, dates, a held-out evaluation protocol and error reporting.</p>
        <p className="mt-3 text-sm"><Link href={`/${city.id}/simulator`} className="underline underline-offset-4">Try the simulator</Link> · <Link href="/research" className="underline underline-offset-4">Research mechanisms and limits</Link></p>
      </header>

      <section aria-labelledby="reference-heading" className="mb-12">
        <h2 id="reference-heading" className="mb-4 text-xl font-semibold">Reference and output definitions</h2>
        <Card><CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Mixed-year reference scenario.</strong> {provenance.note}</p>
          <p>The numerical temperature anchor is {baseline.tempC.toFixed(1)}°C. Adding an assumed response to it does not turn the result into an observed or calibrated physical temperature. The PM2.5 anchor is {baseline.pm25} µg/m³; simulated changes likewise use unverified assumptions.</p>
          <p><strong className="text-foreground">Explicit zero-delta context:</strong> April, N wind, AOD {reference.aod}, {city.zones[reference.zone].label}, daytime, with the reference slider values. The month contribution is the selected profile entry minus April&apos;s entry. The zone contribution is the selected zone offset minus the reference-zone offset. AOD is relative to the city&apos;s demo reference; PM2.5 wind offsets are relative to N. These are modelling conventions, not measured simultaneous conditions.</p>
          <p>The day/night selector changes the assumed aerosol term only; it does not supply separate observed day/night baselines. Guided comparisons hold the same climate context on both sides and report the difference between those scenarios.</p>
          <p><strong className="text-foreground">Synthetic map:</strong> generated zone and feature weights create an illustrative spatial pattern. Its values include local synthetic relief and zone contrasts, omit uniform month/AOD effects, and are independently clipped. Its mean need not equal the headline response. Satellite imagery is a background layer, not a measurement of the coloured overlay.</p>
        </CardContent></Card>
      </section>

      <section aria-labelledby="clipping-heading" className="mb-12">
        <div className="mb-4 flex items-center gap-2"><Ruler className="h-5 w-5 text-amber-400" /><h2 id="clipping-heading" className="text-xl font-semibold">Historical preset: clipping diagnostic</h2></div>
        <Card className="border-amber-900/40"><CardHeader><CardTitle className="text-base">1973-labelled inputs, evaluated under the reference context</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Preset labels are scenario shorthand. Their inputs are unverified and do not reconstruct historical weather. There is no verified, metric-matched historical observation for scoring this calculation. The earlier historical agreement badge and unsupported comparison targets have been removed.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3"><p className="text-xs">Unclipped illustrative response</p><p className="mt-2 font-mono text-lg text-foreground">{raw.unclippedDelta.toFixed(2)}°C-equivalent</p><p className="mt-1 text-xs">Selected assumption range [{raw.unclippedLow.toFixed(2)}, {raw.unclippedHigh.toFixed(2)}]</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs">Clipped display response</p><p className="mt-2 font-mono text-lg text-foreground">{diagnostic.tempDelta.toFixed(2)}°C-equivalent</p><p className="mt-1 text-xs">Selected assumption range [{diagnostic.bands.tempDelta.low.toFixed(2)}, {diagnostic.bands.tempDelta.high.toFixed(2)}]</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs">Saturation status</p><p className="mt-2 font-semibold text-amber-200">{raw.clipped ? 'Central result clipped' : raw.sensitivityClipped ? 'Sensitivity range clipped' : 'No clipping in this run'}</p><p className="mt-1 text-xs">Response bounds: −8 to +12°C-equivalent; PM2.5-equivalent values: 0 to 500 µg/m³.</p></div>
            </div>
            <p>{raw.collapsedByClipping ? 'The nonzero raw range collapses at the display bound. This is saturation, not certainty or historical agreement.' : 'Even without clipping, these selected sensitivity endpoints are not a confidence interval or complete scientific uncertainty.'} Display bounds are demo guardrails, not scientifically established physical limits.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="provenance-heading" className="mb-12">
        <h2 id="provenance-heading" className="mb-4 text-xl font-semibold">Per-input provenance and evidence gaps</h2>
        <p className="mb-4 text-sm text-muted-foreground">All entries below are unverified. “Reported observation” describes the stored attribution, not a verification result. Source/publication year and underlying measurement period are different fields. Missing information is shown explicitly.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {provenance.inputs.map(input => (
            <Card key={input.input}><CardHeader className="pb-2"><CardTitle className="text-base">{input.label}: {baseline[input.input] ?? 'unavailable'}</CardTitle><div className="flex flex-wrap gap-2"><Badge variant="outline">{kindLabel[input.kind]}</Badge><Badge variant="outline">Unverified</Badge></div></CardHeader><CardContent className="space-y-2 text-xs text-muted-foreground">
              <p><strong>Period:</strong> {input.period ?? 'Not recorded'} · <strong>Source year:</strong> {input.sourceYear ?? 'Not recorded'}</p>
              <p><strong>Metric:</strong> {input.metric}</p><p><strong>Footprint:</strong> {input.footprint ?? 'Not recorded; do not assume it matches the simulator boundary'}</p>
              <p><strong>Source attribution:</strong> {input.sourceUrl ? <a href={input.sourceUrl} target="_blank" rel="noreferrer" className="underline">{input.sourceTitle ?? 'Recorded source'}</a> : input.sourceTitle ?? 'No traceable source supplied'}</p>
              <p><strong>Exact locator:</strong> {input.locator ?? 'Not recorded'}</p><p><strong>Derivation:</strong> {input.derivation ?? 'Not documented'}</p><p>{input.note}</p>
            </CardContent></Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="coefficient-heading" className="mb-12">
        <div className="mb-4 flex items-center gap-2"><Microscope className="h-5 w-5 text-blue-400" /><h2 id="coefficient-heading" className="text-xl font-semibold">Coefficient assumptions</h2></div>
        <p className="mb-4 text-sm text-muted-foreground">Central values and low/high ranges are demonstration choices, not measured estimates or confidence intervals. Seasonal, wind, aerosol, night-response and zone constants, including city overrides, also remain unverified. Interval propagation is deterministic, not Monte Carlo.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2 pr-4">Driver / unit</th><th className="py-2 pr-4">Central</th><th className="py-2 pr-4">Selected range</th><th className="py-2">Evidence</th></tr></thead><tbody>
          {(['canopy', 'builtUp', 'water', 'vehicles'] as const).map(key => { const c = coefficients[key]; return <tr key={key} className="border-b"><td className="py-3 pr-4">{c.unit}</td><td className="pr-4 font-mono">{c.central}</td><td className="pr-4 font-mono">{c.low}–{c.high}</td><td className="text-xs text-muted-foreground">{c.source}</td></tr> })}
        </tbody></table></div>
        <p className="mt-4 text-sm text-muted-foreground">Other retained assumptions: canopy night-response factor {coefficients.nightCoolLossFraction}; AOD response per +{coefficients.aod.stepAod}: {coefficients.aod.daytimeCoolingPerStep}°C-equivalent by day, +{coefficients.aod.nighttimeWarmingPerStep}°C-equivalent by night, +{coefficients.aod.pm25PerStep} µg/m³-equivalent PM2.5. No calibrated exposure or weather interpretation follows from these numbers.</p>
      </section>

      <section aria-labelledby="missing-heading" className="mb-12">
        <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /><h2 id="missing-heading" className="text-xl font-semibold">What this does not include</h2></div>
        <div className="space-y-3">{MISSING.map(([title, text]) => <Card key={title}><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{text}</CardContent></Card>)}</div>
      </section>

      <section aria-labelledby="history-heading" className="mb-12">
        <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-400" /><h2 id="history-heading" className="text-xl font-semibold">Separate historical context · 1951–2024</h2></div>
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">
          <p>Repository snapshot attributed to Open-Meteo&apos;s historical archive: annual averages of daily maximum/minimum 2 m air temperature at {history.meta.lat}, {history.meta.lon}. This gridded reanalysis context is separate from both LST and the illustrative response. It is not an IMD station observation or a validation dataset for this demo.</p>
          <svg viewBox="0 0 800 260" className="mt-5 h-auto w-full" role="img" aria-label={`Archived annual mean daily maximum and minimum air temperature context for ${city.name}`}>
            {paths.ticks.map(value => <g key={value}><line x1={44} y1={paths.y(value)} x2={786} y2={paths.y(value)} stroke="currentColor" strokeOpacity={0.1} /><text x={40} y={paths.y(value)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor">{value}°</text></g>)}
            {[1960, 1980, 2000, 2020].map(year => <text key={year} x={paths.x(year)} y={250} textAnchor="middle" fontSize={10} fill="currentColor">{year}</text>)}
            <polyline points={paths.tmax} fill="none" stroke="#fb923c" strokeWidth={1.5} /><polyline points={paths.tmin} fill="none" stroke="#5eead4" strokeWidth={1.5} />
          </svg>
          <p className="mt-2 text-xs">Orange: mean daily maximum · teal: mean daily minimum (°C). Stored retrieval date: {history.meta.fetchedAt.slice(0, 10)}. The archived fetcher did not pin a reanalysis model; product/version and raw-source reproducibility still require review. <a href="https://open-meteo.com/en/docs/historical-weather-api" className="underline" target="_blank" rel="noreferrer">Archive documentation</a>.</p>
          <p className="mt-3 text-xs">Stored 1951–1980 averages: Tmax {history.baseline1951_1980.tmaxMean.toFixed(2)}°C, Tmin {history.baseline1951_1980.tminMean.toFixed(2)}°C. Stored 2015–2024 averages: Tmax {history.recent2015_2024.tmaxMean.toFixed(2)}°C, Tmin {history.recent2015_2024.tminMean.toFixed(2)}°C. Snapshot values have not been independently verified in this release.</p>
        </CardContent></Card>
      </section>

      <section aria-labelledby="evidence-heading">
        <div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-400" /><h2 id="evidence-heading" className="text-xl font-semibold">Mechanism evidence, not coefficient validation</h2></div>
        <p className="text-sm text-muted-foreground"><a href="https://doi.org/10.1073/pnas.1817561116" target="_blank" rel="noreferrer" className="underline">Ziter et al. (2019), PNAS</a> measured urban air temperature in Madison, Wisconsin. Its canopy relationships are nonlinear and depend on spatial scale. It supports canopy/impervious-cover mechanisms, not Taap&apos;s numerical slopes, uncertainty ranges, LST interpretation or transfer to Indian cities.</p>
        <p className="mt-3 text-sm text-muted-foreground">The archived automated source-passage audit ({audit.checkedAt.slice(0, 10)}) found unresolved review and source-text gaps. Its old claim wording has since changed, so it is historical context only. No entry establishes calibration. Earlier unverified bibliographic labels are not presented here as confirmed coefficient sources.</p>
        <p className="mt-3 text-sm"><Link href="/research" className="underline underline-offset-4">Explore the research library</Link></p>
      </section>
    </div>
  )
}
