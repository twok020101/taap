/**
 * GET /api/weather
 *
 * Returns current Bangalore weather from Open-Meteo.
 * ISR-cached for 15 minutes (revalidate: 900).
 */

import { fetchBangaloreWeather } from '@/lib/sources/openMeteo'
import { NextResponse } from 'next/server'

export const revalidate = 900

export async function GET() {
  try {
    const weather = await fetchBangaloreWeather()
    return NextResponse.json(weather)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
