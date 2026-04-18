/**
 * Open-Meteo fetcher for city current weather.
 *
 * No API key required. Uses Next.js fetch cache with revalidate: 900 (15 min).
 * Call with any CityConfig — lat/lng are derived from city.mapCenter.
 */

import type { CityConfig } from '@/cities/types'
import { bangalore } from '@/cities/bangalore'

export interface LiveWeather {
  tempC: number
  humidityPct: number
  windSpeedKmh: number
  windDirDeg: number    // compass heading wind is coming FROM (0–360)
  weatherCode: number   // WMO weather interpretation code
  observedAt: string    // ISO 8601
  summary: string       // short human label e.g. "Partly cloudy"
}

/**
 * WMO weather code to human-readable summary mapping.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
const WMO_SUMMARY: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
}

function wmoSummary(code: number): string {
  return WMO_SUMMARY[code] ?? `Code ${code}`
}

interface OpenMeteoResponse {
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    wind_speed_10m: number
    wind_direction_10m: number
    weather_code: number
  }
}

function isOpenMeteoResponse(data: unknown): data is OpenMeteoResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.current !== 'object' || d.current === null) return false
  const c = d.current as Record<string, unknown>
  return (
    typeof c.time === 'string' &&
    typeof c.temperature_2m === 'number' &&
    typeof c.relative_humidity_2m === 'number' &&
    typeof c.wind_speed_10m === 'number' &&
    typeof c.wind_direction_10m === 'number' &&
    typeof c.weather_code === 'number'
  )
}

function buildUrl(lat: number, lng: number): string {
  return (
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code' +
    '&timezone=Asia%2FKolkata'
  )
}

export async function fetchLiveWeather(city: CityConfig): Promise<LiveWeather> {
  const [lng, lat] = city.mapCenter
  const url = buildUrl(lat, lng)

  const res = await fetch(url, { next: { revalidate: 900 } })

  if (!res.ok) {
    throw new Error(`Open-Meteo returned ${res.status}: ${res.statusText}`)
  }

  const raw: unknown = await res.json()

  if (!isOpenMeteoResponse(raw)) {
    throw new Error('Open-Meteo response did not match expected shape')
  }

  const c = raw.current

  return {
    tempC: Math.round(c.temperature_2m * 10) / 10,
    humidityPct: Math.round(c.relative_humidity_2m),
    windSpeedKmh: Math.round(c.wind_speed_10m * 10) / 10,
    windDirDeg: Math.round(c.wind_direction_10m),
    weatherCode: c.weather_code,
    observedAt: c.time,
    summary: wmoSummary(c.weather_code),
  }
}

/** Back-compat shim — header WeatherPill still uses Bangalore directly. */
export const fetchBangaloreWeather = () => fetchLiveWeather(bangalore)
