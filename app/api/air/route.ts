/**
 * GET /api/air?city=<id>
 *
 * Returns live PM2.5 for the given city from OpenAQ v3.
 * Defaults to Bangalore when city param is missing.
 * ISR-cached for 15 minutes (revalidate: 900).
 */

import { fetchLivePm25 } from '@/lib/sources/openAQ'
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
    const aq = await fetchLivePm25(city)
    if (!aq) {
      return NextResponse.json({ error: 'No live AQ data available' }, { status: 503 })
    }
    return NextResponse.json(aq)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
