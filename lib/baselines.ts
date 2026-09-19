import bangalore from '@/data/bangalore/baseline.json'
import delhi from '@/data/delhi/baseline.json'
import mumbai from '@/data/mumbai/baseline.json'
import chennai from '@/data/chennai/baseline.json'
import type { Baseline } from '@/cities/types'

const baselines: Record<string, Baseline> = { bangalore, delhi, mumbai, chennai }
export function getBaseline(cityId: string): Baseline | null {
  return Object.hasOwn(baselines, cityId) ? baselines[cityId] : null
}
