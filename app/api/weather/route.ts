/**
 * GET /api/weather?city=<id>
 *
 * Returns current weather for the given city from Open-Meteo.
 * Defaults to Bangalore when city param is missing.
 * ISR-cached for 15 minutes (revalidate: 900).
 */

import { fetchLiveWeather } from '@/lib/sources/openMeteo'
import { getCity } from '@/cities'
import { NextResponse, type NextRequest } from 'next/server'

export const revalidate = 900

export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get('city') ?? 'bangalore'
  const city = getCity(cityId)
  if (!city) {
    return NextResponse.json({ error: `Unknown city: ${cityId}` }, { status: 404 })
  }

  try {
    const weather = await fetchLiveWeather(city)
    return NextResponse.json(weather)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
