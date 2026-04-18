# Taap — Project Status

_Last updated: 2026-04-18 (v0.3 — live data integrations landed)_

This document tracks what has been shipped vs. what remains per the original plan in `docs/feat-bangalore-heat-simulator.md` (gitignored branch spec).

## Original plan summary

Build an interactive web app that explains Bangalore's urban heat gain — a scrollytelling 1973→2026 intro followed by a live simulator where sliders modify tree canopy, built-up area, water bodies, vehicles, and population, and show modelled temperature and AQI deltas against an April 2026 baseline. Branded as "Taap" (Hindi तप, heat). Multi-city ready via `cities/<name>.ts` config.

## Done

### Branding & UX
- **Name**: Taap · tagline "Why Indian cities get hot"
- **Logo**: SVG sun + heat rings over a city silhouette (`components/brand/logo.tsx`)
- **Fonts**: Instrument Serif italic (display) + Geist Sans (body) + Geist Mono (readouts), wired via `next/font/google`
- **Header**: sticky, backdrop-blur, logo + wordmark, nav, live weather pill; Delhi/Mumbai/Chennai slots greyed as "soon"
- **Color palette**: dark default, earthy ember + muted forest accents (`app/globals.css`)
- **First-load globe intro**: 3D `cobe` globe, rotates freely then tweens to Bangalore with a pulsing marker, fades out after 3 s, click-to-skip, `sessionStorage` dedup, respects `prefers-reduced-motion`
- **Globe spinner**: 24 px rotating globe loader, used as Suspense fallback for the live-weather pill
- **Ambient particles**: canvas-based, temp-reactive — snow < 20 °C · leaves 20–28 °C · dust motes 28–35 °C · embers > 35 °C. Opacity 0.5, visibility-aware, reduced-motion respected. Driven live by modeled simulator temp.

### Pages
- **`/` — Scrollytelling intro**: editorial hero "Why did Bangalore get hot?", 4 animated stat cards (tree cover lost 91%, wetlands lost 79%, built-up grew 1055%, surface temp +8 °C) plus a 5th live card (annual Bangalore Urban tree-cover-loss in ha from Hansen/GFW). CTA to simulator.
- **`/simulator` — Interactive simulator**: Server Component fetches live weather + live PM2.5 in parallel and passes to a client wrapper. Live weather strip with AQ chip ("PM2.5 · N µg/m³ · N CPCB stations · HH:MM IST"). A muted "live: N µg/m³" pill sits next to the modeled PM2.5 Δ for comparison. Controls:
  - 5 main sliders: tree canopy %, built-up %, water km², vehicles index, population M
  - 4 historical presets: 1973 / 2000 / 2024 / 2026
  - **Climate context section** (new in v0.2):
    - 12-month selector (monsoon modulation)
    - 4-way wind compass N/E/S/W (advection)
    - AOD slider (aerosol forcing, day vs night)
    - 5-zone selector (spatial heterogeneity: Central, South, East, North, Outskirts)
    - Day/night toggle
  - Live readouts: Δ °C, Δ PM2.5, nighttime cooling loss
  - "Where this delta came from" breakdown — per-driver contribution (canopy / built-up / water / aerosol day / aerosol night / monsoon / wind advection / zone offset), colour-coded
- **`/about` — Honesty panel**: split into "Now captured" (4 green cards) and "Still not captured" (6 amber cards). Full coefficient table with peer-reviewed citations.

### Model layer (`model/coefficients.ts`, `model/simulate.ts`)
Pure-function simulator with hybrid approach — published coefficients + Bangalore historical validation:

| Driver | Central | Range | Source |
|---|---|---|---|
| Canopy −1% (day) | +0.09 °C | 0.06–0.12 | PNAS 2019 Ziter, Nature Comms 2024 |
| Canopy −1% (night) | +0.035 °C | 0.02–0.05 | Nature Comms 2024 |
| Built-up +1% | +0.075 °C | 0.05–0.10 | IISc Ramachandra & Bharath 2023 |
| Water −1 km² (≤500 m) | −0.55 °C | −0.3 to −0.8 | Sust. Cities & Society 2024 |
| Vehicles +10% | +4 µg/m³ PM2.5 | 3–5 | KSPCB / UrbanEmissions APnA 2018 |
| AOD day | −0.8 °C / +0.3 | — | Babu et al. ARFI 2013 |
| AOD night | +0.5 °C / +0.3 | — | Babu et al. ARFI 2013 |
| AOD PM2.5 | +30 µg/m³ / +0.3 | — | Babu et al. ARFI 2013 |
| Wind multiplier | E +0.15×, W −0.20×, S +0.10×, N +0.05× | — | KSPCB wind-rose 2022 + zone LULC |
| Monsoon offset (Jul) | −0.5 °C vs annual | — | IMD 1991–2020 |
| Zone offset | Central +1.2 · Outskirts −1.8 °C | — | IISc zone LST 2023 |

Clamping: Δ°C ∈ [−8, +12], PM2.5 ∈ [0, 500]. Model returns a `breakdown` struct so the UI can show per-component contributions.

### Data layer
- `cities/bangalore.ts` and `cities/types.ts` — typed city config, ready for Delhi/Mumbai/Chennai drop-in
- `data/bangalore/baseline.json` — April 2026 snapshot
- `data/bangalore/presets.json` — 1973 / 2000 / 2024 / 2026 anchors
- `data/bangalore/history.json` — homepage stat cards
- `data/bangalore/zones.json` — 5 spatial zones
- `lib/sources/openMeteo.ts` — typed live-weather fetcher, ISR 900 s, no API key
- `lib/sources/openAQ.ts` — typed live PM2.5 fetcher, nearest 5 CPCB/KSPCB stations via OpenAQ v3, median, ISR 900 s, needs `OPENAQ_API_KEY`
- `lib/sources/gfw.ts` — typed annual tree-cover-loss fetcher, `gadm__tcl__adm2_change` for IND/17/5 at 10% threshold, ISR 86 400 s, needs `GFW_API_KEY`
- `app/api/weather/route.ts` · `app/api/air/route.ts` · `app/api/tree-loss/route.ts` — ISR-cached proxies

### Infra
- Next.js 16 App Router + React 19 + TypeScript strict
- Tailwind v4 PostCSS + shadcn/ui (Button, Card, Slider, Tabs, Badge, Separator, Tooltip)
- `pnpm build` clean (zero errors, zero warnings)
- `pnpm lint` clean
- 4 static-prerendered routes with 15-min revalidate
- Git: branch `feat/bangalore-heat-simulator` off `main`, initial repo commit in place

## Pending

### v0.3 — Map & data
- [x] **MapLibre GL heatmap overlay** on the simulator (`feat/map-heatmap`). Client-side ~400 m regular grid (~15k cells) over the city bbox, built from the 5-zone config + a curated `data/bangalore/features.json` (15 lakes, 10 green patches, 10 built-up clusters). Per-cell coefficient compute in `model/simulate-grid.ts` mirrors `simulate.ts` but drops the spatially-uniform monsoon + aerosol components (they'd wash the baseline red). Static `reliefC` per cell surfaces lakes and parks as cooler patches even at sliders=baseline. CartoDB Dark Matter no-labels basemap, no API key. Hover popup shows cell Δ°C and land-cover composition.
- [x] **Live OpenAQ integration** — PM2.5 from CPCB/KSPCB stations via OpenAQ v3. Nearest 5 live Bangalore stations, median, ISR 15 min. Shows in simulator strip + muted pill next to modeled PM2.5. Graceful fallback if unreachable.
- [x] **Live GFW tree-cover-loss feed** — annual Hansen data via `gadm__tcl__adm2_change` dataset (pre-aggregated admin-level). Bengaluru Urban (IND/17/5) at 10% threshold. 5th stat card on homepage. ISR 24 h.
- [ ] **GEE precompute pipeline** — one-off script to generate 1973/2000/2024/2026 Bangalore NDVI/LST rasters as committed PNGs for the intro split-screen.
- [ ] **data.opencity.in** — historical Bangalore daily max/min 1951–2024 CSV ingested as a committed JSON; reference in hero and about page.
- [ ] **Sentinel-2 Q1 2026 composite** — high-res recent imagery for the map base layer (upgrades `feat/map-heatmap`).

### v0.4 — Validation & honesty
- [ ] **Backwards model validation**: re-run the 1973 preset and verify the output matches IISc's observed 1973 LST within ±1 °C. Surface the validation result in `/about`.
- [ ] **Monte Carlo uncertainty bands** on every readout (shade low/central/high).
- [ ] **"Linked" vs "unlinked" slider mode** — default to physically realistic co-variation (moving built-up up pulls canopy down proportionally); free mode lets users explore counterfactuals.
- [ ] **Citation hover tooltips** on every coefficient in the UI (partially present in `/about`; extend to simulator).

### v1 — Multi-city
- [ ] `cities/delhi.ts`, `cities/mumbai.ts`, `cities/chennai.ts` with per-city coefficients + zone overrides + baselines
- [ ] City switcher in header (currently placeholders)
- [ ] Per-city globe-intro markers and zone maps

### v1.1 — Polish & deploy
- [ ] Lighthouse perf ≥ 85 on homepage
- [ ] Mobile QA down to 375 px
- [ ] `share your scenario` URLs — slider state serialized into the URL hash, regeneratable on load
- [ ] OG images per page
- [ ] Vercel production deploy (repo not yet linked; no remote)
- [ ] Analytics (Vercel Web Analytics)

### Out of scope for this project
- Auth / accounts / saved scenarios
- Database / server state
- Real-time Earth Engine / Sentinel Hub compute from the browser
- IMD paid historical data (Open-Meteo ERA5 is the free substitute)

## Known compromises

- **Collapsible climate-context section** uses a manual `useState + Chevron` toggle instead of shadcn's Collapsible (dep not installed).
- **Zod not used** — hand-written type guards for Open-Meteo response (acceptable for one source; revisit if we add more).
- **Instrument Serif** is weight 400 italic only (no bold italic at that weight); display headlines read as intended.
- **Ambient particles + globe spinner** render canvases that flash ~1 frame on slow machines (negligible).

## File map

```
app/
  layout.tsx                 root layout, fonts, AmbientParticles, GlobeIntro
  globals.css                Tailwind v4 + shadcn CSS vars + ember palette
  page.tsx                   scrollytelling intro
  simulator/page.tsx         Server Component, fetches live weather
  about/page.tsx             honesty panel + coefficient citations
  api/weather/route.ts       ISR-cached Open-Meteo proxy
  api/air/route.ts           ISR-cached OpenAQ PM2.5 proxy (15 min)
  api/tree-loss/route.ts     ISR-cached GFW tree-cover-loss proxy (24 h)
components/
  brand/     logo · wordmark · header
  globe/     globe-intro · globe-spinner
  ambient/   ambient-particles (+ useAmbientTemp hook)
  scrolly/   hero · stat-card
  simulator/ slider-panel · readouts · simulator-client · map-placeholder · honesty-inline
  ui/        shadcn primitives
cities/      bangalore.ts · types.ts
model/       coefficients.ts · simulate.ts
data/bangalore/  baseline · presets · history · zones (all JSON)
lib/         utils.ts · sources/{openMeteo,openAQ,gfw}.ts
```
