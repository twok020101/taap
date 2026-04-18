import { SimulatorClient } from '@/components/simulator/simulator-client'
import { fetchLiveWeather } from '@/lib/sources/openMeteo'
import { fetchLivePm25 } from '@/lib/sources/openAQ'
import { getCity } from '@/cities'
import { notFound } from 'next/navigation'
import type { Baseline, PresetYear } from '@/cities/types'
import type { LiveWeather } from '@/lib/sources/openMeteo'

export const revalidate = 900

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
    <SimulatorClient
      city={city}
      baseline={baseline}
      presets={presets}
      liveWeather={liveWeather}
      liveAq={liveAq}
    />
  )
}
