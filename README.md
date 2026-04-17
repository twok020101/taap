# Why Is Bangalore Hot? — Interactive Urban Heat Simulator

An interactive web app that shows why Bangalore has become hotter since 1973 — and lets you move sliders (tree canopy, built-up area, water bodies, vehicles, population) to see the modelled effect on temperature and air quality.

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

The slider model is a reduced-form simulator calibrated on published coefficients (IISc, PNAS, Frontiers in Ecology, MDPI Remote Sensing) and validated against Bangalore historical data. It is **illustrative, not predictive** — see the "What this does NOT include" panel in the app for the full caveat list.
