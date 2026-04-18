/**
 * GET /api/tree-loss
 *
 * Returns Bangalore Urban annual tree-cover-loss from GFW Data API.
 * ISR-cached for 24 hours (revalidate: 86400).
 */

import { fetchBangaloreTreeLoss } from '@/lib/sources/gfw'
import { NextResponse } from 'next/server'

export const revalidate = 86400

export async function GET() {
  const data = await fetchBangaloreTreeLoss()
  if (!data) {
    return NextResponse.json({ error: 'GFW data unavailable' }, { status: 503 })
  }
  return NextResponse.json(data)
}
