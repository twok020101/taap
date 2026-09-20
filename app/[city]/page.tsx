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
import { cityStories } from '@/lib/research'
import { pageMetadata, breadcrumbs } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'
import { ApproachCards } from '@/components/research/approach-cards'

const CARD_ACCENTS = ['red', 'orange', 'amber', 'orange'] as const

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city)
  if (!city) notFound()
  const name = city.id === 'bangalore' ? 'Bangalore (Bengaluru)' : city.name
  return pageMetadata(`Why is ${name} getting hotter? Urban heat & environment | Taap`, `Explore ${name}'s trees, water and built-up surfaces, its urban heat story, and research-informed approaches to cooling. Try an illustrative simulator.`, `/${city.id}`, `/${city.id}/opengraph-image`)
}

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
      <StructuredData data={breadcrumbs([{ name: 'Taap', path: '/' }, { name: city.name, path: `/${city.id}` }])}/>
      <Hero city={city} />

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <p className="eyebrow">The environment around you</p>
        <h2 className="section-title mt-3">{cityStories[city.id].setting}</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{cityStories[city.id].question}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Urban land cover changes shade, evaporation and heat storage. Regional climate and weather also matter. Taap explores simplified scenarios; it cannot attribute the city’s observed warming to individual causes.</p>
        <div className="mt-8"><ApproachCards slugs={cityStories[city.id].approaches}/></div>
      </section>

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
            A record of urban transformation
          </h2>
          <p className="mt-3 text-muted-foreground">
            {city.name}. Periods and sources differ by card; these are not a single comparable time series.
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
          Explore how changes in canopy, water and built-up area move the illustrative heat model for {city.name}.
          Compare scenarios with the same weather context, then inspect the assumptions behind each result.
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
