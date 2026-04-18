/**
 * GET /api/tree-loss?city=<id>
 *
 * Returns annual tree-cover-loss for the given city from GFW Data API.
 * Defaults to Bangalore when city param is missing.
 * ISR-cached for 24 hours (revalidate: 86400).
 */

import { fetchTreeLoss } from '@/lib/sources/gfw'
import { getCity } from '@/cities'
import { NextResponse, type NextRequest } from 'next/server'

export const revalidate = 86400

export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get('city') ?? 'bangalore'
  const city = getCity(cityId)
  if (!city) {
    return NextResponse.json({ error: `Unknown city: ${cityId}` }, { status: 404 })
  }

  const data = await fetchTreeLoss(city)
  if (!data) {
    return NextResponse.json({ error: 'GFW data unavailable' }, { status: 503 })
  }
  return NextResponse.json(data)
}
