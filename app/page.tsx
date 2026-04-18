import { Hero } from '@/components/scrolly/hero'
import { StatCard } from '@/components/scrolly/stat-card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import historyData from '@/data/bangalore/history.json'
import type { HistoryData } from '@/cities/types'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { fetchBangaloreTreeLoss } from '@/lib/sources/gfw'

const history = historyData as HistoryData

const CARD_ACCENTS = ['red', 'orange', 'amber', 'orange'] as const

export default async function HomePage() {
  const treeLoss = await fetchBangaloreTreeLoss()
  return (
    <div>
      <Hero />

      <Separator />

      {/* Stat cards section */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            The data behind the heat
          </p>
          <h2
            className="text-4xl md:text-5xl tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
          >
            50 years of urban transformation
          </h2>
          <p className="mt-3 text-muted-foreground">
            Bangalore, 1973 → 2026. Sources: IISc Ramachandra &amp; Bharath; Landsat 30-year studies.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {history.stats.map((stat, i) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              source={stat.source}
              accent={CARD_ACCENTS[i] ?? 'default'}
            />
          ))}
          {treeLoss && (
            <StatCard
              label={`Tree cover lost in ${treeLoss.latestYear}`}
              value={treeLoss.latestLossHa}
              suffix=" ha"
              source="Hansen/GFW · 30 m"
              accent="amber"
              liveValue
            />
          )}
        </div>
      </section>

      <Separator />

      {/* Narrative section */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2
          className="mb-8 text-4xl md:text-5xl tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          The causal chain
        </h2>
        <div className="space-y-4 text-left text-muted-foreground">
          <p>
            <strong className="text-foreground">Trees cool cities</strong> through evapotranspiration and
            shade. Bangalore&apos;s canopy dropped from ~68% coverage in 1973 to under 6% in 2026 —
            directly translating to higher daytime land surface temperatures (LST).
          </p>
          <p>
            <strong className="text-foreground">Lakes and tanks act as air conditioners</strong> — the
            city had 262 lakes in 1960; by 2024 fewer than 80 remained. Each lost km² of water body
            within 500 m of a neighbourhood raises its LST by an estimated 0.3–0.8°C.
          </p>
          <p>
            <strong className="text-foreground">Concrete and asphalt absorb and re-radiate heat</strong>.
            Built-up land grew from 8% to 93% of the city&apos;s footprint — every extra percentage point
            adds ~0.075°C to the urban heat island.
          </p>
          <p>
            <strong className="text-foreground">Vehicles add PM2.5 and combustion heat</strong>.
            Bangalore&apos;s vehicle fleet grew from thousands to over 10 million registered vehicles —
            contributing directly to PM2.5 concentrations and indirectly to the energy budget.
          </p>
        </div>

        <div className="mt-10">
          <Button asChild size="lg" className="gap-2">
            <Link href="/simulator">
              See it in the simulator <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
