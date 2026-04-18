import { SimulatorClient } from '@/components/simulator/simulator-client'
import { fetchBangaloreWeather } from '@/lib/sources/openMeteo'
import type { Baseline } from '@/cities/types'
import type { LiveWeather } from '@/lib/sources/openMeteo'
import baselineData from '@/data/bangalore/baseline.json'

export const revalidate = 900

const baseline = baselineData as Baseline

export default async function SimulatorPage() {
  let liveWeather: LiveWeather | null = null

  try {
    liveWeather = await fetchBangaloreWeather()
  } catch {
    // Degrade gracefully — strip is hidden when null
  }

  return <SimulatorClient baseline={baseline} liveWeather={liveWeather} />
}
