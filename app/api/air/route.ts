/**
 * GET /api/air
 *
 * Returns live Bangalore PM2.5 from OpenAQ v3 (CPCB/KSPCB stations).
 * ISR-cached for 15 minutes (revalidate: 900).
 */

import { fetchBangaloreLivePm25 } from '@/lib/sources/openAQ'
import { NextResponse } from 'next/server'

export const revalidate = 900

export async function GET() {
  try {
    const aq = await fetchBangaloreLivePm25()
    if (!aq) {
      return NextResponse.json({ error: 'No live AQ data available' }, { status: 503 })
    }
    return NextResponse.json(aq)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
