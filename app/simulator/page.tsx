import { SimulatorClient } from '@/components/simulator/simulator-client'
import { fetchBangaloreWeather } from '@/lib/sources/openMeteo'
import { fetchBangaloreLivePm25 } from '@/lib/sources/openAQ'
import type { Baseline } from '@/cities/types'
import type { LiveWeather } from '@/lib/sources/openMeteo'
import type { LiveAq } from '@/lib/sources/openAQ'
import baselineData from '@/data/bangalore/baseline.json'

export const revalidate = 900

const baseline = baselineData as Baseline

export default async function SimulatorPage() {
  const [liveWeather, liveAq] = await Promise.all([
    fetchBangaloreWeather().catch((): LiveWeather | null => null),
    fetchBangaloreLivePm25(),
  ])

  return <SimulatorClient baseline={baseline} liveWeather={liveWeather} liveAq={liveAq} />
}
