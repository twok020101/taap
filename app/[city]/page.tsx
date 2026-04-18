import { Hero } from '@/components/scrolly/hero'
import { RasterStrip } from '@/components/scrolly/raster-strip'
import { StatCard } from '@/components/scrolly/stat-card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { HistoryData } from '@/cities/types'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { fetchTreeLoss } from '@/lib/sources/gfw'
import { getCity } from '@/cities'
import { notFound } from 'next/navigation'

const CARD_ACCENTS = ['red', 'orange', 'amber', 'orange'] as const

export async function generateStaticParams() {
  const { cityIds } = await import('@/cities')
  return cityIds.map((city) => ({ city }))
}

export default async function CityHomePage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: cityId } = await params
  const city = getCity(cityId)
  if (!city) notFound()

  const historyModule = await import(`@/data/${cityId}/history.json`)
  const history = historyModule.default as HistoryData

  const treeLoss = await fetchTreeLoss(city)

  return (
    <div>
      <Hero city={city} />

      <Separator />

      {/* Satellite raster split-screen */}
      <RasterStrip city={city} />

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
            {city.name}, 1973 → 2026. Sources cited per card.
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

      {/* CTA to simulator */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2
          className="mb-6 text-4xl md:text-5xl tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          What if it played out differently?
        </h2>
        <p className="text-muted-foreground">
          Move the sliders to explore how much of {city.name}&apos;s temperature rise comes
          from tree loss, lake loss, built-up growth, and aerosols — and what a different
          path might have looked like.
        </p>

        <div className="mt-10">
          <Button asChild size="lg" className="gap-2">
            <Link href={`/${city.id}/simulator`}>
              See it in the simulator <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
