import type { CityConfig } from './types'
import { bangalore } from './bangalore'
import { delhi } from './delhi'
import { chennai } from './chennai'
import { mumbai } from './mumbai'

/**
 * City registry. The order here drives the header switcher and the
 * city-picker splash tile order.
 */
const registry: Record<string, CityConfig> = {
  bangalore,
  delhi,
  chennai,
  mumbai,
}

export const cityIds = Object.keys(registry)

export function getCity(id: string): CityConfig | null {
  return registry[id] ?? null
}

export function getAllCities(): CityConfig[] {
  return Object.values(registry)
}
