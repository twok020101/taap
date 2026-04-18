import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { coefficients } from '@/model/coefficients'
import { simulate } from '@/model/simulate'
import { getCity } from '@/cities'
import { notFound } from 'next/navigation'
import type { Baseline, PresetYear } from '@/cities/types'
import { AlertTriangle, BookOpen, CheckCircle2, Microscope, Ruler, TrendingUp, XCircle } from 'lucide-react'

interface CaveatItem {
  title: string
  explanation: string
}

const NOW_CAPTURED: CaveatItem[] = [
  {
    title: 'Seasonal / monsoon modulation',
    explanation:
      'A monthly offset table (IMD climatology 1991–2020) shifts the baseline temperature to reflect the city\'s dry-hot, monsoon, and post-monsoon phases. The "Climate context" month selector lets you explore the full annual cycle.',
  },
  {
    title: 'Wind-direction advection',
    explanation:
      'Four cardinal wind directions apply a multiplier to the slider-driven temperature delta based on the land-use axis they blow across — dense built-up / IT corridors warm, green / coastal fringes cool. Multipliers and PM2.5 offsets are calibrated per city where published wind-roses exist and inherited with caveat elsewhere.',
  },
  {
    title: 'Aerosol optical depth (AOD) forcing',
    explanation:
      'An AOD slider (0.1–1.0) captures aerosol radiative forcing in both directions: daytime cooling from solar dimming, nighttime warming from IR trapping. AOD also feeds into PM2.5. A time-of-day toggle switches which effect dominates.',
  },
  {
    title: 'Spatial heterogeneity via zones',
    explanation:
      'Each city is divided into five zones, each with its own canopy/built-up/water baseline and a residual zone temperature offset. Selecting a zone snaps the sliders to that zone\'s land-use baseline and adds the zone offset to the output.',
  },
  {
    title: 'Live PM2.5 from CPCB/state-board stations via OpenAQ',
    explanation:
      'Live PM2.5 from CPCB/state-board stations via OpenAQ, updated every 15 min (falls back silently if unreachable). The live reading is observational only — it does not rebase the model\'s PM2.5 calculation, which remains a function of the slider state against the April 2026 baseline.',
  },
]

const STILL_MISSING: CaveatItem[] = [
  {
    title: 'Street-scale microclimate (tree shade at your exact location)',
    explanation:
      'Coefficients are calibrated to zone-mean LST from Landsat 30 m studies. Individual streets can differ by 3–5°C depending on tree shade, building geometry, surface albedo, and local traffic.',
  },
  {
    title: 'Long-range aerosol transport (IGP intrusion, stubble-burn plumes)',
    explanation:
      'During winter months, haze plumes from the Indo-Gangetic plain can advect into other regions. The AOD slider captures local aerosol load but cannot simulate multi-day transport events or associated PM2.5 spikes of 200+ µg/m³.',
  },
  {
    title: 'Climate-change background trajectory (future years)',
    explanation:
      'The April 2026 baseline already embeds decades of warming. The sliders explore the urban-heat-island contribution but do not project future years under SSP scenarios.',
  },
  {
    title: 'Real-time hyperlocal LST (only zone-mean approximation)',
    explanation:
      'The live weather strip shows Open-Meteo near-surface air temperature at the city centroid. It is not a land surface temperature (LST) measurement, not disaggregated by zone, and not real-time satellite imagery.',
  },
  {
    title: 'Boundary-layer physics, cloud feedbacks, soil moisture',
    explanation:
      'Urban heat island intensity is modulated by boundary-layer height, synoptic cloud cover, and antecedent soil moisture. These require a mesoscale numerical weather model and cannot be reduced to a slider coefficient.',
  },
  {
    title: 'Anthropogenic heat release (ACs, industrial discharge) beyond aggregate vehicle proxy',
    explanation:
      'Air conditioning units, data centres, and industrial heat discharge represent a meaningful UHI contribution but have no peer-reviewed city-wide emission inventory at the needed resolution. The vehicle slider proxies road transport only.',
  },
]

interface CoeffRow {
  label: string
  driver: string
  central: string
  range: string
  effect: string
}

const COEFF_ROWS: CoeffRow[] = [
  {
    label: 'Tree Canopy',
    driver: 'Per −1 pp canopy',
    central: `+${coefficients.canopy.central}°C`,
    range: `${coefficients.canopy.low}–${coefficients.canopy.high}°C`,
    effect: 'LST (daytime)',
  },
  {
    label: 'Built-up Area',
    driver: 'Per +1 pp built-up',
    central: `+${coefficients.builtUp.central}°C`,
    range: `${coefficients.builtUp.low}–${coefficients.builtUp.high}°C`,
    effect: 'LST',
  },
  {
    label: 'Water Bodies',
    driver: 'Per −1 km² water',
    central: `+${coefficients.water.central}°C`,
    range: `${coefficients.water.low}–${coefficients.water.high}°C`,
    effect: 'LST (within 500 m)',
  },
  {
    label: 'Vehicles Index',
    driver: 'Per +10 pp index',
    central: `+${coefficients.vehicles.central} µg/m³`,
    range: `${coefficients.vehicles.low}–${coefficients.vehicles.high} µg/m³`,
    effect: 'PM2.5 only',
  },
  {
    label: 'AOD forcing (day)',
    driver: 'Per +0.3 AOD above 0.4',
    central: `${coefficients.aod.daytimeCoolingPerStep}°C`,
    range: 'single-value estimate',
    effect: 'LST cooling',
  },
  {
    label: 'AOD forcing (night)',
    driver: 'Per +0.3 AOD above 0.4',
    central: `+${coefficients.aod.nighttimeWarmingPerStep}°C`,
    range: 'single-value estimate',
    effect: 'LST warming',
  },
]

interface AnnualRow {
  y: number
  tmaxMean: number
  tminMean: number
  nDays: number
}

interface TempHistory {
  annual: AnnualRow[]
  baseline1951_1980: { tmaxMean: number; tminMean: number }
  recent2015_2024: { tmaxMean: number; tminMean: number }
  anomalyDegC: { tmax: number; tmin: number }
  meta: { station: string }
}

function buildPaths(annual: AnnualRow[]) {
  const W = 800
  const H = 260
  const padL = 44
  const padR = 14
  const padT = 14
  const padB = 28

  const minTmin = Math.min(...annual.map((r) => r.tminMean))
  const maxTmax = Math.max(...annual.map((r) => r.tmaxMean))
  const yMin = Math.floor(minTmin - 0.5)
  const yMax = Math.ceil(maxTmax + 0.5)

  const xRange = annual[annual.length - 1].y - annual[0].y
  const xScale = (year: number) =>
    padL + ((year - annual[0].y) / xRange) * (W - padL - padR)
  const yScale = (val: number) =>
    padT + ((yMax - val) / (yMax - yMin)) * (H - padT - padB)

  const toPolyline = (key: keyof Pick<AnnualRow, 'tmaxMean' | 'tminMean'>) =>
    annual.map((r) => `${xScale(r.y).toFixed(1)},${yScale(r[key]).toFixed(1)}`).join(' ')

  const tmaxPath = toPolyline('tmaxMean')
  const tminPath = toPolyline('tminMean')

  const yTicks: number[] = []
  for (let v = Math.ceil(yMin / 2) * 2; v <= yMax; v += 2) yTicks.push(v)

  const xTicks: number[] = []
  for (let yr = 1960; yr <= 2020; yr += 10) xTicks.push(yr)

  return { tmaxPath, tminPath, yTicks, xTicks, xScale, yScale, yMin, yMax }
}

/** Per-city validation target — April 1951–1970 IMD observed mean. Add when citable. */
const VALIDATION_OBSERVED: Record<string, number> = {
  bangalore: 22.0,
}
const VALIDATION_GATE_C = 1.0

export async function generateStaticParams() {
  const { cityIds } = await import('@/cities')
  return cityIds.map((city) => ({ city }))
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: cityId } = await params
  const city = getCity(cityId)
  if (!city) notFound()

  const [baselineModule, presetsModule, historyModule] = await Promise.all([
    import(`@/data/${cityId}/baseline.json`),
    import(`@/data/${cityId}/presets.json`),
    import(`@/data/${cityId}/temperature-history.json`),
  ])
  const baseline = baselineModule.default as Baseline
  const presets = presetsModule.default as Record<PresetYear, Baseline>
  const historyData = historyModule.default as TempHistory

  const validationTarget = VALIDATION_OBSERVED[cityId]
  const defaultZone = Object.keys(city.zones)[0] ?? 'central'
  const p1973 = presets['1973']
  const modelOut = simulate(
    city,
    baseline,
    {
      canopyPct: p1973.canopyPct,
      builtUpPct: p1973.builtUpPct,
      waterKm2: p1973.waterKm2,
      vehiclesIndex: p1973.vehiclesIndex,
      populationM: p1973.populationM,
    },
    { month: 4, windDir: 'N', aod: 0.4, zone: defaultZone, timeOfDay: 'day' },
  )
  const validation = validationTarget !== undefined ? {
    modelled: modelOut.tempC,
    modelledLow: baseline.tempC + modelOut.bands.tempDelta.low,
    modelledHigh: baseline.tempC + modelOut.bands.tempDelta.high,
    observed: validationTarget,
    error: modelOut.tempC - validationTarget,
    absError: Math.abs(modelOut.tempC - validationTarget),
    passed: Math.abs(modelOut.tempC - validationTarget) <= VALIDATION_GATE_C,
  } : null

  const annual = historyData.annual
  const { tmaxPath, tminPath, yTicks, xTicks, xScale, yScale } = buildPaths(annual)
  const histBaseline = historyData.baseline1951_1980
  const recent = historyData.recent2015_2024
  const anomaly = historyData.anomalyDegC
  const baselineTmaxY = yScale(histBaseline.tmaxMean)

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10">
        <Badge variant="outline" className="mb-4">
          Model Honesty Panel · {city.name}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          What this model captures — and what it doesn&apos;t
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          An illustrative simulator, not a forecast. Ranges come from peer-reviewed
          literature — see citations below. Read these caveats before citing the outputs.
        </p>
      </div>

      {validation && (
        <section className="mb-14">
          <div className="mb-4 flex items-center gap-2">
            <Ruler className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Backwards validation</h2>
          </div>
          <Card
            className={
              validation.passed
                ? 'border-emerald-900/40 bg-emerald-950/10'
                : 'border-amber-900/40 bg-amber-950/10'
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {validation.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-400" />
                )}
                1973 preset vs IMD historical record
                <Badge
                  variant={validation.passed ? 'default' : 'destructive'}
                  className="ml-auto font-mono text-[11px]"
                >
                  {validation.passed ? 'PASS' : 'FAIL'} (±{VALIDATION_GATE_C.toFixed(1)}°C gate)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="mb-3">
                Rewinding the sliders to their 1973 values (canopy {p1973.canopyPct}%,
                built-up {p1973.builtUpPct}%, water {p1973.waterKm2} km², vehicles index{' '}
                {p1973.vehiclesIndex}) against the April 2026 baseline should reproduce the
                IMD-recorded April mean.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card/50 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Modelled
                  </div>
                  <div className="mt-1 font-mono text-lg text-orange-300">
                    {validation.modelled.toFixed(1)}°C
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground/70">
                    [{validation.modelledLow.toFixed(1)}…{validation.modelledHigh.toFixed(1)}]°C
                  </div>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Observed (IMD 1951–1970)
                  </div>
                  <div className="mt-1 font-mono text-lg">
                    {validation.observed.toFixed(1)}°C
                  </div>
                  <div className="text-[11px] text-muted-foreground/70">
                    April mean, {city.name} WMO
                  </div>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Error
                  </div>
                  <div
                    className={`mt-1 font-mono text-lg ${
                      validation.passed ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {validation.error > 0 ? '+' : ''}
                    {validation.error.toFixed(2)}°C
                  </div>
                  <div className="text-[11px] text-muted-foreground/70">
                    |error| ≤ {VALIDATION_GATE_C.toFixed(1)}°C
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {!validation && (
        <section className="mb-14">
          <Card className="border-muted-foreground/20 bg-card/30">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <strong className="text-foreground">Backwards validation not yet wired for {city.name}.</strong>{' '}
              A citable April 1951–1970 IMD observed mean is required. Added for Bangalore;
              pending source for {city.name}.
            </CardContent>
          </Card>
        </section>
      )}

      {/* Historical temperature */}
      <section className="mb-14">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-400" />
          <h2 className="text-xl font-semibold">Historical temperature · 1951–2024</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-card/50 p-3">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  1951–1980 Baseline
                </div>
                <div className="mt-1 font-mono text-sm">
                  Tmax {histBaseline.tmaxMean.toFixed(2)} °C · Tmin{' '}
                  {histBaseline.tminMean.toFixed(2)} °C
                </div>
              </div>
              <div className="rounded-lg border bg-card/50 p-3">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  2015–2024 Recent
                </div>
                <div className="mt-1 font-mono text-sm">
                  Tmax {recent.tmaxMean.toFixed(2)} °C · Tmin {recent.tminMean.toFixed(2)} °C
                </div>
              </div>
              <div className="rounded-lg border bg-card/50 p-3">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Anomaly
                </div>
                <div className="mt-1 font-mono text-sm">
                  <span className="text-orange-300">
                    {anomaly.tmax >= 0 ? '+' : ''}
                    {anomaly.tmax.toFixed(2)} °C
                  </span>{' '}
                  (Tmax) · {anomaly.tmin >= 0 ? '+' : ''}
                  {anomaly.tmin.toFixed(2)} °C (Tmin)
                </div>
              </div>
            </div>

            <svg
              viewBox="0 0 800 260"
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Annual mean Tmax and Tmin for ${city.name}, 1951 to 2024`}
            >
              {yTicks.map((v) => (
                <g key={v}>
                  <line
                    x1={44}
                    y1={yScale(v)}
                    x2={786}
                    y2={yScale(v)}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeWidth={1}
                  />
                  <text
                    x={40}
                    y={yScale(v)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={10}
                    fill="currentColor"
                    opacity={0.45}
                  >
                    {v}
                  </text>
                </g>
              ))}

              <line
                x1={44}
                y1={baselineTmaxY}
                x2={786}
                y2={baselineTmaxY}
                stroke="#fb923c"
                strokeOpacity={0.35}
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              {xTicks.map((yr) => (
                <g key={yr}>
                  <line
                    x1={xScale(yr)}
                    y1={232}
                    x2={xScale(yr)}
                    y2={236}
                    stroke="currentColor"
                    strokeOpacity={0.3}
                    strokeWidth={1}
                  />
                  <text
                    x={xScale(yr)}
                    y={246}
                    textAnchor="middle"
                    fontSize={10}
                    fill="currentColor"
                    opacity={0.45}
                  >
                    {yr}
                  </text>
                </g>
              ))}

              <polyline
                points={tmaxPath}
                fill="none"
                stroke="#fb923c"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              <polyline
                points={tminPath}
                fill="none"
                stroke="#5eead4"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              <circle cx={700} cy={22} r={4} fill="#fb923c" />
              <text x={708} y={22} dominantBaseline="middle" fontSize={11} fill="currentColor" opacity={0.7}>
                Tmax
              </text>
              <circle cx={740} cy={22} r={4} fill="#5eead4" />
              <text x={748} y={22} dominantBaseline="middle" fontSize={11} fill="currentColor" opacity={0.7}>
                Tmin
              </text>
            </svg>

            <p className="mt-3 text-xs text-muted-foreground">
              Source: Open-Meteo ERA5 Archive, {historyData.meta.station}. 2 m air
              temperature reanalysis — not LST. Different from the homepage +LST stat.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator className="mb-14" />

      <section className="mb-14">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">Now captured</h2>
        </div>
        <div className="flex flex-col gap-4">
          {NOW_CAPTURED.map(({ title, explanation }) => (
            <Card key={title} className="border-emerald-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-300">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{explanation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mb-14" />

      <section className="mb-14">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-semibold">Still not captured</h2>
        </div>
        <div className="flex flex-col gap-4">
          {STILL_MISSING.map(({ title, explanation }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{explanation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mb-14" />

      <section className="mb-14">
        <div className="mb-4 flex items-center gap-2">
          <Microscope className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold">Coefficient table</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Central estimates from regression studies. Low/high give the reported uncertainty
          range — propagated as low–high bands next to every central number in the simulator
          readouts. Currently calibrated to Bangalore; per-city overrides (monsoon, wind,
          AOD, built-up) land with the validated citations for each city.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="py-2 pr-4">Driver</th>
                <th className="py-2 pr-4">Change</th>
                <th className="py-2 pr-4">Central</th>
                <th className="py-2 pr-4">Range</th>
                <th className="py-2 pr-4">Effect on</th>
              </tr>
            </thead>
            <tbody>
              {COEFF_ROWS.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{row.label}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.driver}</td>
                  <td className="py-3 pr-4 font-mono text-orange-400">{row.central}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{row.range}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Separator className="mb-14" />

      <section>
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">Citations</h2>
        </div>
        <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Ziter et al. 2019</strong> — Scale-dependent
            interactions between tree canopy cover and impervious surfaces reduce daytime
            urban heat during summer. <em>PNAS</em> 116(15): 7575–7580. Canopy coefficient.
          </li>
          <li>
            <strong className="text-foreground">Manoli et al. 2024</strong> — Seasonal and
            diurnal modulation of the urban heat island by tree cover. <em>Nature Communications</em>.
            Canopy range.
          </li>
          <li>
            <strong className="text-foreground">IISc Ramachandra &amp; Bharath 2023</strong> —
            Spatiotemporal dynamics of urbanisation and LST in Bangalore 1973–2023.
            Built-up coefficient and historical land-use data.
          </li>
          <li>
            <strong className="text-foreground">Sustainable Cities &amp; Society 2024</strong> —
            Meta-analysis of urban water body cooling effects across Asian megacities.
            Water body coefficient 0.3–0.8°C/km².
          </li>
          <li>
            <strong className="text-foreground">KSPCB / UrbanEmissions APnA 2018</strong> —
            Bangalore vehicle-fleet emission factors; wind-rose 2022.
          </li>
          <li>
            <strong className="text-foreground">Babu et al., ARFI 2013</strong> — Aerosol
            Radiative Forcing over India. AOD forcing coefficients.
          </li>
          <li>
            <strong className="text-foreground">IMD climatology 1991–2020</strong> —
            Monthly mean temperature normals per city. Monsoon and seasonal offset source.
          </li>
        </ol>
      </section>
    </div>
  )
}
