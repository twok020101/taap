/**
 * OpenAQ v3 fetcher — live PM2.5 from CPCB/state-board stations near a city.
 *
 * Returns null on any unrecoverable failure so callers never need to catch.
 * ISR-cached per fetch call at revalidate: 900 (15 min).
 */

import type { CityConfig } from '@/cities/types'
import { bangalore } from '@/cities/bangalore'

export interface LiveAqStation {
  name: string
  distanceM: number
  valueUgm3: number
  observedAt: string  // ISO UTC
}

export interface LiveAq {
  valueUgm3: number       // median across active stations
  observedAt: string      // most recent station timestamp (ISO UTC)
  stationCount: number
  stations: LiveAqStation[]
}

// ── Internal API shapes (only fields we read) ───────────────────────────────

interface AqDatetime {
  utc: string
}

interface AqLocation {
  id: number
  name: string
  distance?: number
  coordinates?: { latitude: number; longitude: number }
  datetimeLast: AqDatetime | null
  sensors: AqSensor[]
}

// The /v3/locations payload only supplies id + parameter per sensor.
// Per-sensor freshness lives on /v3/sensors/{id}.latest.datetime.
interface AqSensor {
  id: number
  parameter: { name: string }
}

interface AqLocationsResponse {
  results: AqLocation[]
}

interface AqLatest {
  value: number
  datetime: AqDatetime
}

interface AqSensorResult {
  latest: AqLatest
}

interface AqSensorResponse {
  results: AqSensorResult[]
}

// ── Type guards ──────────────────────────────────────────────────────────────

function isAqDatetime(v: unknown): v is AqDatetime {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  return typeof d.utc === 'string'
}

function isAqSensor(v: unknown): v is AqSensor {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (typeof s.id !== 'number') return false
  const param = s.parameter as Record<string, unknown> | undefined
  return typeof param?.name === 'string'
}

function isAqLocation(v: unknown): v is AqLocation {
  if (typeof v !== 'object' || v === null) return false
  const loc = v as Record<string, unknown>
  if (typeof loc.id !== 'number') return false
  if (typeof loc.name !== 'string') return false
  if (loc.datetimeLast !== null && !isAqDatetime(loc.datetimeLast)) return false
  if (!Array.isArray(loc.sensors)) return false
  return loc.sensors.every(isAqSensor)
}

function isAqLocationsResponse(data: unknown): data is AqLocationsResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return Array.isArray(d.results) && d.results.every(isAqLocation)
}

function isAqSensorResponse(data: unknown): data is AqSensorResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.results) || d.results.length === 0) return false
  const r = d.results[0] as Record<string, unknown>
  if (typeof r.latest !== 'object' || r.latest === null) return false
  const latest = r.latest as Record<string, unknown>
  return typeof latest.value === 'number' && isAqDatetime(latest.datetime)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const API_KEY = process.env.OPENAQ_API_KEY ?? ''

const HEADERS = { 'X-API-Key': API_KEY }

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

function buildLocationsUrl(lat: number, lon: number): string {
  return (
    `https://api.openaq.org/v3/locations` +
    `?coordinates=${lat},${lon}&radius=25000&parameters_id=2&limit=50`
  )
}

export async function fetchLivePm25(city: CityConfig): Promise<LiveAq | null> {
  const [lon, lat] = city.mapCenter
  const locationsUrl = buildLocationsUrl(lat, lon)

  try {
    // Step 1: fetch nearby PM2.5 locations
    const locRes = await fetch(locationsUrl, {
      headers: HEADERS,
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(5000),
    })
    if (!locRes.ok) return null

    const locRaw: unknown = await locRes.json()
    if (!isAqLocationsResponse(locRaw)) return null

    const nowMs = Date.now()
    const threeHoursMs = 3 * 60 * 60 * 1000

    // Step 2: filter to locations with fresh datetimeLast (within 3 h).
    // Some locations have datetimeLast: null (decommissioned stations) — drop them.
    const freshLocations = locRaw.results.filter((loc) => {
      if (loc.datetimeLast === null) return false
      const lastMs = new Date(loc.datetimeLast.utc).getTime()
      return nowMs - lastMs <= threeHoursMs
    })

    // Step 3: sort by distance ascending, take nearest 5
    const withDistance = freshLocations.map((loc) => {
      const distanceM =
        typeof loc.distance === 'number'
          ? loc.distance
          : loc.coordinates
          ? haversineM(lat, lon, loc.coordinates.latitude, loc.coordinates.longitude)
          : Infinity
      return { loc, distanceM }
    })
    withDistance.sort((a, b) => a.distanceM - b.distanceM)
    const nearest5 = withDistance.slice(0, 5)

    // Step 4: per-location, call /v3/sensors/{id} for every pm25 sensor in parallel,
    // pick the one with a fresh latest reading (some locations carry an old sensor
    // alongside an active one — we can only tell by reading the sensor's own latest).
    const stationPromises = nearest5.map(async ({ loc, distanceM }): Promise<LiveAqStation | null> => {
      const pm25Sensors = loc.sensors.filter(
        (s) => s.parameter.name.toLowerCase() === 'pm25',
      )
      if (pm25Sensors.length === 0) return null

      const sensorReadings = await Promise.allSettled(
        pm25Sensors.map(async (s) => {
          const res = await fetch(`https://api.openaq.org/v3/sensors/${s.id}`, {
            headers: HEADERS,
            next: { revalidate: 900 },
            signal: AbortSignal.timeout(5000),
          })
          if (!res.ok) return null
          const raw: unknown = await res.json()
          if (!isAqSensorResponse(raw)) return null
          return raw.results[0].latest
        }),
      )

      const validLatest = sensorReadings
        .filter((r): r is PromiseFulfilledResult<AqLatest> =>
          r.status === 'fulfilled' && r.value !== null,
        )
        .map((r) => r.value)
        .filter((l) => {
          if (l.value <= 0 || l.value >= 1000) return false
          const ageMs = nowMs - new Date(l.datetime.utc).getTime()
          return ageMs <= threeHoursMs
        })

      if (validLatest.length === 0) return null

      const freshest = validLatest.reduce((best, l) =>
        new Date(l.datetime.utc) > new Date(best.datetime.utc) ? l : best,
      )

      return {
        name: loc.name,
        distanceM,
        valueUgm3: freshest.value,
        observedAt: freshest.datetime.utc,
      }
    })

    // Use allSettled so partial sensor failures don't abort the whole batch
    const settled = await Promise.allSettled(stationPromises)
    const stations: LiveAqStation[] = settled
      .filter(
        (r): r is PromiseFulfilledResult<LiveAqStation> =>
          r.status === 'fulfilled' && r.value !== null,
      )
      .map((r) => r.value)

    if (stations.length < 2) return null

    const valueUgm3 = Math.round(median(stations.map((s) => s.valueUgm3)))

    // Use the most recent observedAt
    const observedAt = stations.reduce((latest, s) =>
      new Date(s.observedAt) > new Date(latest.observedAt) ? s : latest,
    ).observedAt

    return { valueUgm3, observedAt, stationCount: stations.length, stations }
  } catch {
    return null
  }
}

/** Back-compat shim. */
export const fetchBangaloreLivePm25 = () => fetchLivePm25(bangalore)
