import { SimulatorClient } from '@/components/simulator/simulator-client'
import { fetchLiveWeather } from '@/lib/sources/openMeteo'
import { fetchLivePm25 } from '@/lib/sources/openAQ'
import { getCity } from '@/cities'
import { notFound } from 'next/navigation'
import type { Baseline, PresetYear } from '@/cities/types'
import type { LiveWeather } from '@/lib/sources/openMeteo'
import { pageMetadata, breadcrumbs } from '@/lib/seo'
import { StructuredData } from '@/components/structured-data'

export const revalidate = 900

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city)
  if (!city) notFound()
  return pageMetadata(`${city.name} urban heat & air quality simulator | Taap`, `Change tree canopy, built-up area, water and vehicles in ${city.name}. Compare illustrative environmental effects, coefficient ranges and research limitations.`, `/${city.id}/simulator`, `/${city.id}/opengraph-image`)
}

export async function generateStaticParams() {
  const { cityIds } = await import('@/cities')
  return cityIds.map((city) => ({ city }))
}

export default async function SimulatorPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: cityId } = await params
  const city = getCity(cityId)
  if (!city) notFound()

  const [baselineModule, presetsModule] = await Promise.all([
    import(`@/data/${cityId}/baseline.json`),
    import(`@/data/${cityId}/presets.json`),
  ])
  const baseline = baselineModule.default as Baseline
  const presets = presetsModule.default as Record<PresetYear, Baseline>

  const [liveWeather, liveAq] = await Promise.all([
    fetchLiveWeather(city).catch((): LiveWeather | null => null),
    fetchLivePm25(city),
  ])

  return (
    <>
    <StructuredData data={breadcrumbs([{ name: 'Taap', path: '/' }, { name: city.name, path: `/${city.id}` }, { name: 'Simulator', path: `/${city.id}/simulator` }])}/>
    <SimulatorClient
      city={city}
      baseline={baseline}
      presets={presets}
      liveWeather={liveWeather}
      liveAq={liveAq}
    />
    </>
  )
}
