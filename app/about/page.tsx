import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { coefficients } from '@/model/coefficients'
import { simulate } from '@/model/simulate'
import baselineData from '@/data/bangalore/baseline.json'
import presetsData from '@/data/bangalore/presets.json'
import type { Baseline, PresetYear } from '@/cities/types'
import { AlertTriangle, BookOpen, CheckCircle2, Microscope, Ruler, XCircle } from 'lucide-react'

interface CaveatItem {
  title: string
  explanation: string
}

const NOW_CAPTURED: CaveatItem[] = [
  {
    title: 'Seasonal / monsoon modulation',
    explanation:
      'A monthly offset table (IMD climatology 1991–2020) shifts the baseline temperature to reflect Bangalore\'s dry hot season (Apr–May), monsoon onset (Jun), peak monsoon cooling (Jul–Aug), and post-monsoon warmth (Oct). The "Climate context" month selector lets you explore the full annual cycle.',
  },
  {
    title: 'Wind-direction advection',
    explanation:
      'Four cardinal wind directions (N / E / S / W) apply a multiplier to the slider-driven temperature delta based on what is upwind: the Whitefield IT corridor to the east adds heat and PM2.5; the Mysuru road / green belt to the west brings cooler, cleaner air. Source: KSPCB wind-rose 2022 + zone land-use analysis.',
  },
  {
    title: 'Aerosol optical depth (AOD) forcing',
    explanation:
      'An AOD slider (0.1–1.0) captures aerosol radiative forcing in both directions: daytime cooling from solar dimming (−0.8°C per +0.3 AOD), and nighttime warming from IR trapping (+0.5°C per +0.3 AOD). AOD also feeds into PM2.5 (+30 µg/m³ per +0.3 AOD). A time-of-day toggle switches which effect dominates. Source: Babu et al., ARFI 2013.',
  },
  {
    title: 'Spatial heterogeneity via 5 zones',
    explanation:
      'Bangalore is divided into five zones (Central CBD, South, East, North, Outskirts), each with its own canopy/built-up/water baseline and a residual zone temperature offset derived from IISc LST maps. Selecting a zone snaps the sliders to that zone\'s land-use baseline and adds the zone offset to the output. Source: Ramachandra & Bharath 2023; IISc LST maps.',
  },
  {
    title: 'Live PM2.5 from CPCB/KSPCB stations via OpenAQ',
    explanation:
      'Live PM2.5 from CPCB/KSPCB stations via OpenAQ, updated every 15 min (falls back silently if unreachable). The live reading is observational only — it does not rebase the model\'s PM2.5 calculation, which remains a function of the slider state against the April 2026 baseline.',
  },
]

const STILL_MISSING: CaveatItem[] = [
  {
    title: 'Street-scale microclimate (tree shade at your exact location)',
    explanation:
      'Coefficients are calibrated to zone-mean LST from Landsat 30 m studies. Individual streets can differ by 3–5°C depending on tree shade, building geometry, surface albedo, and local traffic. The zone readout hides this intra-zone heterogeneity.',
  },
  {
    title: 'Long-range aerosol transport (Indo-Gangetic plain intrusion events)',
    explanation:
      'During winter months, haze plumes from the IGP can advect into the Deccan plateau. The AOD slider captures local aerosol load but cannot simulate multi-day transport events or the associated PM2.5 spikes of 200+ µg/m³ that occasionally affect Bangalore.',
  },
  {
    title: 'Climate-change background trajectory (future years)',
    explanation:
      'The April 2026 baseline already embeds decades of warming. The sliders explore the urban-heat-island contribution but do not project future years under SSP scenarios. Adding 0.2°C per decade for the regional background warming (IPCC AR6) would be possible but is not currently wired.',
  },
  {
    title: 'Real-time hyperlocal LST (only zone-mean approximation)',
    explanation:
      'The live weather strip shows the Open-Meteo near-surface air temperature for the city centroid. It is not a land surface temperature (LST) measurement, not disaggregated by zone, and not real-time satellite imagery. Treat it as orientation, not precision.',
  },
  {
    title: 'Boundary-layer physics, cloud feedbacks, soil moisture',
    explanation:
      'Urban heat island intensity is modulated by boundary-layer height, synoptic cloud cover, and antecedent soil moisture (especially after monsoon onset). These require a mesoscale numerical weather model and cannot be reduced to a slider coefficient.',
  },
  {
    title: 'Anthropogenic heat release (cars, ACs) beyond aggregate vehicle proxy',
    explanation:
      'Air conditioning units, data centres, and industrial heat discharge represent a meaningful UHI contribution in a city the size of Bangalore — but there is no peer-reviewed city-wide emission inventory at the resolution needed for a coefficient. The vehicle slider proxies road transport only.',
  },
]

interface CoeffRow {
  label: string
  driver: string
  central: string
  range: string
  effect: string
  source: string
}

const COEFF_ROWS: CoeffRow[] = [
  {
    label: 'Tree Canopy',
    driver: 'Per −1 pp canopy',
    central: `+${coefficients.canopy.central}°C`,
    range: `${coefficients.canopy.low}–${coefficients.canopy.high}°C`,
    effect: 'LST (daytime)',
    source: coefficients.canopy.source,
  },
  {
    label: 'Built-up Area',
    driver: 'Per +1 pp built-up',
    central: `+${coefficients.builtUp.central}°C`,
    range: `${coefficients.builtUp.low}–${coefficients.builtUp.high}°C`,
    effect: 'LST',
    source: coefficients.builtUp.source,
  },
  {
    label: 'Water Bodies',
    driver: 'Per −1 km² water',
    central: `+${coefficients.water.central}°C`,
    range: `${coefficients.water.low}–${coefficients.water.high}°C`,
    effect: 'LST (within 500 m)',
    source: coefficients.water.source,
  },
  {
    label: 'Vehicles Index',
    driver: 'Per +10 pp index',
    central: `+${coefficients.vehicles.central} µg/m³`,
    range: `${coefficients.vehicles.low}–${coefficients.vehicles.high} µg/m³`,
    effect: 'PM2.5 only',
    source: coefficients.vehicles.source,
  },
  {
    label: 'AOD forcing (day)',
    driver: 'Per +0.3 AOD above 0.4',
    central: `${coefficients.aod.daytimeCoolingPerStep}°C`,
    range: 'single-value estimate',
    effect: 'LST cooling',
    source: 'Babu et al., ARFI 2013',
  },
  {
    label: 'AOD forcing (night)',
    driver: 'Per +0.3 AOD above 0.4',
    central: `+${coefficients.aod.nighttimeWarmingPerStep}°C`,
    range: 'single-value estimate',
    effect: 'LST warming',
    source: 'Babu et al., ARFI 2013',
  },
]

/**
 * Backwards validation: rewind the sliders to the 1973 preset values against
 * the April 2026 baseline, run the model, and compare the modelled ambient
 * temperature to the IMD-derived 1973 observed April mean.
 *
 * Reference: 22.0°C — Bangalore WMO-station April mean, IMD historical normals
 * 1951–1970 (the 1973 preset `tempC` field is sourced from the same normals).
 * Gate: ±1°C per the branch acceptance criteria.
 */
const baseline = baselineData as Baseline
const presets = presetsData as Record<PresetYear, Baseline>
const VALIDATION_OBSERVED_1973_C = 22.0
const VALIDATION_GATE_C = 1.0

function runValidation() {
  const p1973 = presets['1973']
  const out = simulate(
    baseline,
    {
      canopyPct: p1973.canopyPct,
      builtUpPct: p1973.builtUpPct,
      waterKm2: p1973.waterKm2,
      vehiclesIndex: p1973.vehiclesIndex,
      populationM: p1973.populationM,
    },
    { month: 4, windDir: 'N', aod: 0.4, zone: 'central', timeOfDay: 'day' },
  )
  const error = out.tempC - VALIDATION_OBSERVED_1973_C
  return {
    modelled: out.tempC,
    modelledLow: baseline.tempC + out.bands.tempDelta.low,
    modelledHigh: baseline.tempC + out.bands.tempDelta.high,
    observed: VALIDATION_OBSERVED_1973_C,
    error,
    absError: Math.abs(error),
    passed: Math.abs(error) <= VALIDATION_GATE_C,
  }
}

export default function AboutPage() {
  const validation = runValidation()
  const validationPassed = validation.passed

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10">
        <Badge variant="outline" className="mb-4">
          Model Honesty Panel
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          What this model captures — and what it doesn&apos;t
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          It&apos;s a scientifically calibrated simulator, not a forecast.
          Ranges come from peer-reviewed literature — see citations below.
          Read these caveats before citing the outputs.
        </p>
      </div>

      {/* Backwards validation */}
      <section className="mb-14">
        <div className="mb-4 flex items-center gap-2">
          <Ruler className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold">Backwards validation</h2>
        </div>
        <Card
          className={
            validationPassed ? 'border-emerald-900/40 bg-emerald-950/10' : 'border-amber-900/40 bg-amber-950/10'
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {validationPassed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-amber-400" />
              )}
              1973 preset vs IMD historical record
              <Badge
                variant={validationPassed ? 'default' : 'destructive'}
                className="ml-auto font-mono text-[11px]"
              >
                {validationPassed ? 'PASS' : 'FAIL'} (±{VALIDATION_GATE_C.toFixed(1)}°C gate)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">
              Rewinding the sliders to their 1973 values (canopy {presets['1973'].canopyPct}%,
              built-up {presets['1973'].builtUpPct}%, water {presets['1973'].waterKm2} km²,
              vehicles index {presets['1973'].vehiclesIndex}) against the April 2026 baseline
              should reproduce the IMD-recorded April mean temperature at Bangalore WMO station.
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
                  April mean, Bangalore WMO
                </div>
              </div>
              <div className="rounded-lg border bg-card/50 p-3">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Error
                </div>
                <div
                  className={`mt-1 font-mono text-lg ${
                    validationPassed ? 'text-emerald-300' : 'text-amber-300'
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
            <p className="mt-4 text-xs">
              This is a back-of-the-envelope check, not a formal skill score. It tests whether the
              coefficients can reproduce the aggregate ambient warming Bangalore has seen since
              1973 — not whether the model predicts any individual year. The modelled band
              assumes the [low, high] coefficient range — if it contains {validation.observed.toFixed(1)}°C,
              the observed value is within the model&apos;s stated uncertainty.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator className="mb-14" />

      {/* Now captured */}
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

      {/* Still not captured */}
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

      {/* Coefficients table */}
      <section className="mb-14">
        <div className="mb-4 flex items-center gap-2">
          <Microscope className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold">Coefficient table</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          All values are the <em>central estimate</em> from regression studies. Low/high
          give the reported uncertainty range. The simulator readouts now propagate these
          ranges as low–high bands next to every central number.
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

      {/* Citations */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">Citations</h2>
        </div>
        <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Ziter et al. 2019</strong> — Scale-dependent
            interactions between tree canopy cover and impervious surfaces reduce daytime
            urban heat during summer. <em>PNAS</em> 116(15): 7575–7580.
            Canopy coefficient source.
          </li>
          <li>
            <strong className="text-foreground">Manoli et al. 2024</strong> — Seasonal
            and diurnal modulation of the urban heat island by tree cover.
            <em> Nature Communications</em>. Canopy range source.
          </li>
          <li>
            <strong className="text-foreground">IISc Ramachandra &amp; Bharath 2023</strong> —
            Spatiotemporal dynamics of urbanisation and land surface temperature in Bangalore
            1973–2023. <em>Sustainable Cities and Society</em>.
            Built-up coefficient, historical land-use data, and zone-wise LULC.
          </li>
          <li>
            <strong className="text-foreground">Sustainable Cities &amp; Society 2024</strong> —
            Meta-analysis of urban water body cooling effects across Asian megacities.
            Water body coefficient range 0.3–0.8°C/km².
          </li>
          <li>
            <strong className="text-foreground">KSPCB / UrbanEmissions APnA 2018</strong> —
            Air Pollution (near real-time) Analysis for India. Bangalore vehicle-fleet
            emission factors; PM2.5 coefficient 3–5 µg/m³ per 10% fleet change.
            Wind-rose 2022 for advection direction effects.
          </li>
          <li>
            <strong className="text-foreground">Babu et al., ARFI 2013</strong> —
            Aerosol Radiative Forcing over India (ARFI) network. Bangalore AOD
            forcing coefficients: daytime cooling, nighttime warming, PM2.5 relationship.
          </li>
          <li>
            <strong className="text-foreground">IMD climatology Bangalore 1991–2020</strong> —
            Monthly mean temperature normals for the Bangalore WMO station.
            Monsoon and seasonal offset table source.
          </li>
          <li>
            <strong className="text-foreground">Landsat 1992–2017 LST record</strong> —
            Used by IISc for the observed +8°C LST rise cited in the homepage stat cards.
          </li>
        </ol>
      </section>
    </div>
  )
}
