# Why Is Bangalore Hot? — Interactive Urban Heat Simulator

An interactive web app for Bangalore, Delhi, Mumbai and Chennai. Explore modelled temperature and air quality with tree-canopy, built-up, water-area and vehicle controls. Population is read-only context; the simulator has no independent population effect.

Baseline: April 2026. Built with Next.js 16, Tailwind, shadcn/ui, MapLibre, deployed to Vercel.

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Why this exists

Bangalore lost ~88% of its tree cover and ~79% of its wetlands between 1973 and 2023, while built-up area grew more than tenfold. Land surface temperatures rose by nearly 8°C in 25 years. Numbers alone don't land — sliders do.

## Model honesty

The slider model combines documented coefficients with simplified seasonal, wind, aerosol and zone effects. It is **illustrative, not predictive**. Selected coefficient ranges are not complete scientific uncertainty. The methodology page shows source-audit gaps; missing water-area evidence is omitted explicitly rather than treated as zero.

## Environmental story, research and discovery

The homepage includes an accessible, three-state streetscape explaining shade, heat storage and water movement. It is a conceptual illustration, not a temperature map. Each city links to relevant approaches, and the simulator explains environmental changes alongside a paired comparison against baseline inputs with identical climate context.

`/research` and six `/research/[slug]` pages document paper findings, study methods, geography, metrics, applicability limits and simulator coverage. The shared typed registry is `lib/research.ts`. New papers support the educational content; they do not certify or replace the existing unverified numerical coefficients. Reflective roofs and exposure equity are research context, not new numerical simulator controls.

Page titles, descriptions, canonical URLs, social previews, JSON-LD and `/sitemap.xml` support discovery. `/research.json` and `/llms.txt` expose the same evidence and limitations for machine readers. The text guide is a convenience, not a search-engine requirement or a promise of AI citations. See [Google’s AI search guidance](https://developers.google.com/search/docs/appearance/ai-features).

The canonical origin defaults to the verified public domain `https://taap.thetwok.in`. Set `NEXT_PUBLIC_SITE_URL` to an absolute HTTP(S) origin when moving the public site. Preview deployment URLs are intentionally ignored. Existing Cloudflare DNS and Vercel hosting do not need to change for this release.

## Scenario explorer and Jev

Every city simulator includes guided comparisons, a natural-language explorer using Jev, and a conclusion checker. Proposed changes are shown with exact amounts before users apply them. The model computes all outputs; Jev interprets requests and checks consistency with supplied evidence.

Set `TYPESAFE_API_KEY` in the server environment (or ignored `.env.local`) and optionally `TYPESAFE_MODEL=jev-1.13.0`. Never use a `NEXT_PUBLIC_` variable for the key. If the key is unavailable or a request fails, guided comparisons and sliders still work. If you keep the key in a shell profile, load that profile before starting Next.js.

```bash
pnpm test
pnpm lint
pnpm build
# Requires TYPESAFE_API_KEY in the process environment:
pnpm eval:jev
pnpm audit:evidence
```

See [the integration and evaluation notes](docs/jev-integration.md) for scope, evidence inputs, limits and impact measurement. Nothing is deployed by these commands.
