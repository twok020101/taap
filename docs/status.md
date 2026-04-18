# Taap — Project Status

_Last updated: 2026-04-18 (v1.1 polish — factual fixes, Chennai T3 overrides, per-city validation cards, dev-skip cobe, shareable scenarios, OG images, analytics)_

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
- `scripts/snapshot-rasters.mjs` — NASA GIBS MODIS raster snapshotter (`pnpm rasters`)
- `scripts/fetch-history-temps.mjs` — Open-Meteo ERA5 historical-temperature ingester (`pnpm history`)
- `data/bangalore/temperature-history.json` — 1951–2024 annual + monthly Tmax/Tmin + anomalies
- `public/rasters/bangalore/{2000,2024,2026}-{ndvi,lst}.png` + `sources.json` — committed GIBS MODIS snapshots

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
- [x] **Raster precompute pipeline** (`scripts/snapshot-rasters.mjs`, `pnpm rasters`) — one-off ESM Node script fetching NASA EOSDIS GIBS MODIS Terra monthly composites (NDVI + daytime LST) via WMS GetMap, no auth, no `sharp` / compositing. Committed at `public/rasters/bangalore/{2000,2024,2026}-{ndvi,lst}.png` + sidecar `sources.json`. 2026 slot uses 2026-03-01 (Q1, latest full month available). **Substitution**: GEE replaced with public GIBS; this is honest — we never had GEE auth. **1973 handled as a text-only "pre-satellite era" tile** in the homepage split-screen citing IISc Ramachandra & Bharath 2023 LULC reconstruction; no faked imagery.
- [x] **Historical temperature ingest** (`scripts/fetch-history-temps.mjs`, `pnpm history`) — single fetch against the free Open-Meteo ERA5 Archive API (no key), 1951-01-01 → 2024-12-31 daily Tmax/Tmin for Bangalore, aggregated to 74 annual + 888 monthly rows plus 1951–1980 baseline, 2015–2024 recent decade, and derived anomalies. Committed at `data/bangalore/temperature-history.json` (~98 KB). **Substitution**: data.opencity.in replaced with ERA5 reanalysis — CLAUDE.md already names ERA5 as the IMD substitute. Wired into hero sub-line ("ERA5: annual Tmax +0.56 °C, Tmin +0.81 °C vs 1951–1980 mean") and into `/about` as a full 1951–2024 annual SVG line chart with explicit LST-vs-air-temp disclaimer.
- [x] **Sentinel-2 cloudless 2024 base layer** on the simulator map. Free EOX WMTS endpoint (no auth) added as a Dark ↔ Satellite segmented toggle above the map; heatmap overlay stays on top with fill-opacity tuned per basemap. **Substitution**: Q1 2026 requires Copernicus auth; 2024 EOX cloudless composite is the latest free source. Caveat is surfaced in the UI next to the toggle.
- [x] **Homepage raster split-screen** (`components/scrolly/raster-strip.tsx`) — 4-column × 2-row grid (NDVI + LST across 1973 / 2000 / 2024 / 2026 Q1) rendered between the hero and the stat cards. 1973 column is the pre-satellite text tile; other three are served from `public/rasters/bangalore/`.

### v0.4 — Validation & honesty
- [x] **Backwards model validation**: 1973-preset run against the 2026 baseline reproduces the IMD April-mean (22.0 °C) with error −0.20 °C, well inside the ±1 °C gate. Rendered as a pass/fail card at the top of `/about`.
- [x] **Monte Carlo uncertainty bands** — `simulate()` now returns `bands: { tempDelta, pm25Delta, nightCoolLoss, breakdown }` propagated from the `{low, high}` coefficient ranges. Rendered as `[low … high]` brackets next to every headline and breakdown row.
- [x] **"Linked" vs "unlinked" slider mode** — default linked; moving built-up ↔ canopy applies a 0.6× opposite-direction coupling (IISc LULC 1973–2023, conservative end of the 0.6–1.4 ratio). Free mode for counterfactuals. Toggle in the slider panel.
- [x] **Citation hover tooltips on simulator** — every BreakdownRow in `readouts.tsx` (canopy, built-up, water, aerosol-day, aerosol-night, monsoon, advection, zone) now carries an `Info` tooltip with description + source.

### v1 — Multi-city
- [x] **Architecture refactor**: `cities/types.ts` decoupled from Bangalore (`ZoneKey = string`, `zones`/`features` carried on `CityConfig`); `model/{simulate,simulate-grid,grid}.ts` and all three `lib/sources/*` fetchers parameterized with `CityConfig`; API routes accept `?city=<id>`; `scripts/{snapshot-rasters,fetch-history-temps}.mjs` accept `--city=<id>`.
- [x] **Route refactor**: `/` is now a city-picker splash. `/[city]` / `/[city]/simulator` / `/[city]/about` dynamic-segment routes with `generateStaticParams`; 12 city×route combinations prerendered. Unknown `[city]` ids return 404.
- [x] **Header switcher**: 4 cities as highlight-current chips (`useSelectedLayoutSegment`); Sim/About links live when a city is active; live-weather pill fetches `/api/weather?city=<id>` client-side.
- [x] **Per-city globe-intro**: `GlobeIntro` accepts `cityName + target=[lat,lng]` and a per-city sessionStorage dedup key; mounted in `app/[city]/layout.tsx`.
- [x] **`cities/delhi.ts`**: full `CityConfig`, GADM codes (IND/7/1), IMD Safdarjung 1991–2020 monsoon-offset table (verbatim quoted from Climate of Delhi, Wikipedia), AOD reference 0.77 (MODIS peak, flagged).
- [x] **`cities/mumbai.ts`**: full `CityConfig`, GADM codes (IND/20/18 Suburban), IMD Santacruz 1991–2020 monsoon offsets (verbatim) capturing Jul/Aug monsoon cooling −3.0/−3.4 °C and October Heat +2.5 °C — absent from Bangalore's profile.
- [x] **`cities/chennai.ts`**: full `CityConfig`, GADM codes (IND/31/2), 5 zones with engineering-estimate land-use at zone level anchored to cited citywide aggregates (ISFR 2023 4.66% canopy; MDPI 2017 70.35% built-up; 90% Pallikaranai loss). Coefficient overrides deferred — Chennai T3 requires a re-run with web tools (first pass blanket-inherited).
- [x] **Per-city data**: `data/<city>/{baseline,presets,history,zones,features,temperature-history}` for all four cities. Baselines sourced from IMD (April Tmax), CPCB/CSE (PM2.5), FSI ISFR (canopy), published LULC (built-up), mapped / Wikipedia-cited (water), transport-dept ratios (vehicles index vs Bangalore=100), UN/Census projections (population). Presets anchored to cited 2024/2000 data where citable; historical estimates flagged in the `$comment` field.
- [x] **Per-city rasters**: `public/rasters/<city>/{2000,2024,2026}-{ndvi,lst}.png` + `sources.json` generated via `pnpm rasters --city=<id>` for all four cities (NASA GIBS MODIS, keyless).
- [x] **Per-city temperature history**: `data/<city>/temperature-history.json` generated via `pnpm history --city=<id>` (Open-Meteo ERA5 Archive, 1951–2024 daily aggregated to annual + monthly + anomaly).
- [x] **Per-city coefficient overrides**: `CityConfig.coefficientOverrides` (monsoon offsets, AOD reference, wind advection/PM2.5) merged onto Bangalore defaults inside `simulate()` / `simulateGrid()`. Delhi + Mumbai plumb real monsoon tables; Chennai inherits Bangalore pending T3 re-run.
- [x] **Model-honesty preserved**: every city's `/<city>/about` renders its own validation card (or a "not wired — pending citable IMD 1951–1970 observed" banner for cities without one), its own ERA5 annual Tmax/Tmin chart, and the shared coefficient table with "inherited from Bangalore where no city-specific peer-reviewed calibration exists" disclosure.
- [x] **`pnpm build` clean**: 12 city-route combinations + splash + 3 API routes prerendered with Next.js 16 + Turbopack.

### v1.1 — Polish & deploy
- [x] **Chennai T3 coefficient re-run** — v1.1 research audit confirmed Chennai-specific verbatim quotes only exist for `aod.referenceAod` (0.43 — Amanollahi et al. 2021, DOI 10.1007/s12517-021-07455-y) and `monsoonOffsets` (IMD Nungambakkam 1991–2020 via Climate of Chennai, Wikipedia). Wired in `cities/chennai.ts.coefficientOverrides`. Remaining 8 coefficients inherit from Bangalore with documented reasons (no per-pp canopy/built-up source, Care Earth Trust wetland-loss extent is not a cooling coefficient, emission inventories are in Gg/yr not marginal µg/m³, sea-breeze wind advection is qualitatively documented but no peer-reviewed °C multiplier) — inheritance is surfaced in the honesty panel.
- [x] **Dev-mode canvas stability** — applied `process.env.NODE_ENV !== 'production'` skip in `GlobeIntroHost`; cobe's internal WebGL teardown throws inside React 19 StrictMode's dev-only effect double-invoke ("removeChild on canvas"). Production build verified clean (curl /bangalore → 200 + expected content). `GlobeIntroHost` lifted to `app/layout.tsx` regardless for the root singleton architecture. Honest trade: dev is intro-less, prod ships the intro.
- [x] **Per-city validation target** — Delhi 35.5 °C (IMD Safdarjung WMO 42182 via tutiempo, 1957–1962 sample + 1991–2020 normal trend cross-check, medium confidence), Mumbai 32.6 °C (NOAA GHCN-M v4 Tavg IN012070800 1951–1970 + GHCN-Daily Tmax−Tavg offset from 1973–1982, medium confidence), Chennai 34.0 °C (back-projected: IMD Nungambakkam 1991–2020 normal 34.5 °C minus Kothawale 2012 phase-1 warming ~0.5 °C, medium confidence). All three render on `/<city>/about` with an `est.` badge and the source citation shown inline. Bangalore 22.0 °C stays the only high-confidence card.
- [x] **Chennai pm25 quote year** — baseline `_source_pm25` now pins to "Ambient air pollution and daily mortality in ten cities of India (The Lancet Planetary Health, 2024)", DOI 10.1016/S2542-5196(24)00114-1, with the exact Citizen Matters quote ("The city, with an annual PM-2.5… of 33.7 micrograms per cubic meter, is estimated to have 2,870 deaths linked to air pollution each year.").
- [x] **Bangalore GADM codes** — corrected `cities/bangalore.ts` from `adm1: 17, adm2: 5` (Kasaragod, Kerala) to `adm1: 16, adm2: 3` (Bengaluru Urban). Verified against Global Forest Watch dashboard title tags. GFW tree-cover-loss queries now target the intended district.
- [x] **`share your scenario` URLs** — full slider + climate-context state serialised into `window.location.hash` via `components/simulator/use-scenario-hash.ts` (short-keyed URLSearchParams, RAF-debounced write, one-shot read-on-mount hydration with hydrated-gate to avoid write loops). "Copy scenario link" button in the simulator header surfaces the current URL with a transient "Link copied" confirm.
- [x] **OG images per page** — Next 16 `app/opengraph-image.tsx` (root splash — "Why Indian cities get hot") + `app/[city]/opengraph-image.tsx` (per-city — "{City} · Why it gets hot"). Rendered via `ImageResponse`, ember/serif palette matching the product. `metadataBase` now derives from `NEXT_PUBLIC_SITE_URL ?? VERCEL_URL ?? localhost` so link-preview scrapers resolve the OG URLs correctly once the app is deployed.
- [x] **Analytics** — `@vercel/analytics@2.0.1` installed, `<Analytics />` mounted in `app/layout.tsx`. Noops outside Vercel (the local-dev `/_vercel/insights/script.js` 404s are expected and stop once the project is linked to a Vercel deploy).
- [ ] **Lighthouse perf ≥ 85** — not yet measured; deferred to post-deploy real-URL run.
- [ ] **Mobile QA at 375 px** — preview-browser verification was flaky this session; deferred to a dedicated follow-up on the deployed URL.
- [ ] **Vercel production deploy** — intentionally held for user-initiated action (repo not yet linked).

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
  scrolly/   hero · stat-card · raster-strip
  simulator/ slider-panel · readouts · simulator-client · heatmap-map · honesty-inline
  ui/        shadcn primitives
cities/      bangalore.ts · types.ts
model/       coefficients.ts · simulate.ts · simulate-grid.ts · grid.ts
data/bangalore/  baseline · presets · history · zones · temperature-history · features (all JSON)
lib/         utils.ts · sources/{openMeteo,openAQ,gfw}.ts
scripts/     snapshot-rasters.mjs · fetch-history-temps.mjs
public/rasters/bangalore/  committed MODIS PNGs (2000/2024/2026 · NDVI + LST) + sources.json
```
