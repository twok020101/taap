import Link from 'next/link'
import { getAllCities } from '@/cities'
import { ArrowRight } from 'lucide-react'

export default function SplashPage() {
  const cities = getAllCities()

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:py-28">
      <div className="mb-12 text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Taap · तप · heat
        </p>
        <h1
          className="text-5xl md:text-7xl leading-[1.05] tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          Why <span style={{ color: 'oklch(0.72 0.18 52)' }}>Indian cities</span>
          <br />
          get hot
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
          Illustrative heat simulator calibrated to peer-reviewed coefficients. Pick a city
          to explore its 1973→2026 land-use story, its zone-by-zone heatmap, and a slider
          that rewinds tree cover, built-up area, and aerosol load.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {cities.map((city) => (
          <Link
            key={city.id}
            href={`/${city.id}`}
            className="group flex flex-col gap-2 rounded-lg border border-border bg-card/60 p-5 transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Explore
            </p>
            <div className="flex items-baseline justify-between">
              <h2
                className="text-3xl tracking-tight"
                style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
              >
                {city.name}
              </h2>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
              {city.mapCenter[1].toFixed(2)}°N, {city.mapCenter[0].toFixed(2)}°E · {city.id}
            </p>
          </Link>
        ))}
      </div>

      <p className="mx-auto mt-14 max-w-xl text-center text-xs text-muted-foreground/70">
        Each city carries its own baseline, historical presets, zones, curated features, and
        (where citable) per-city coefficients. Coefficients inherited from Bangalore where
        no city-specific peer-reviewed calibration exists are flagged in the UI.
      </p>
    </div>
  )
}
