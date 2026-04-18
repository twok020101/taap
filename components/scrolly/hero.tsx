import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import type { CityConfig, HistoryData } from '@/cities/types'

interface HeroProps {
  city: CityConfig
  /** Optional ERA5-derived anomaly (°C vs 1951–1980 mean), for the mono sub-line. */
  eraAnomaly?: { tmax: number; tmin: number } | null
  /** Optional full history data — hero shows the first 3 stats inline. */
  history?: HistoryData | null
}

export function Hero({ city, eraAnomaly, history }: HeroProps) {
  const topStats = history?.stats.slice(0, 3) ?? []

  return (
    <section className="relative overflow-hidden bg-background py-24 md:py-40">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: [
            'radial-gradient(ellipse 90% 60% at 50% -10%, oklch(0.55 0.18 42 / 0.18), transparent)',
            'radial-gradient(ellipse 60% 40% at 20% 80%, oklch(0.3 0.08 145 / 0.08), transparent)',
            'radial-gradient(ellipse 50% 30% at 80% 90%, oklch(0.45 0.12 30 / 0.07), transparent)',
          ].join(', '),
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <p
          className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          April 2026 · Illustrative model · {city.name}
        </p>

        <h1
          className="mb-6 text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          Why did{' '}
          <span style={{ color: 'oklch(0.72 0.18 52)' }}>{city.name}</span>
          <br />
          get hot?
        </h1>

        {topStats.length > 0 && (
          <p
            className="mx-auto mb-4 max-w-2xl text-lg md:text-2xl text-muted-foreground leading-relaxed"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {topStats.map((stat, i) => (
              <span key={stat.label}>
                {i > 0 && (i === topStats.length - 1 ? ', and ' : ', ')}
                <strong className="text-foreground">
                  {stat.value}
                  {stat.suffix}
                </strong>{' '}
                <span className="text-muted-foreground/80">
                  {stat.label.toLowerCase()}
                </span>
              </span>
            ))}
            .
          </p>
        )}

        {eraAnomaly && (
          <p
            className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground/80"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ERA5: annual Tmax{' '}
            <span className="text-foreground">
              {eraAnomaly.tmax >= 0 ? '+' : ''}
              {eraAnomaly.tmax.toFixed(2)}°C
            </span>
            , Tmin{' '}
            <span className="text-foreground">
              {eraAnomaly.tmin >= 0 ? '+' : ''}
              {eraAnomaly.tmin.toFixed(2)}°C
            </span>{' '}
            vs 1951–1980 mean
          </p>
        )}

        <p className="mx-auto mb-10 max-w-xl text-base text-muted-foreground">
          Move the sliders to see how each driver contributed — and what partial
          recovery looks like.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href={`/${city.id}/simulator`}>
              Open the simulator <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/${city.id}/about`}>Read the caveats</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
