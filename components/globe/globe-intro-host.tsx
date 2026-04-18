'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { getCity } from '@/cities'
import { GlobeIntro } from './globe-intro'

/**
 * Root-layout-level mount point for GlobeIntro. Reads the top-level route
 * segment (city id) on the client and renders a per-city intro. Moving the
 * mount here (rather than in the `[city]/layout.tsx` server layout) means
 * navigation between cities doesn't force an RSC-driven layout remount —
 * React owns the unmount/mount cycle inside a stable client tree, which
 * avoids the `removeChild` race between cobe's WebGL cleanup and React's
 * DOM reconciliation in dev StrictMode.
 *
 * Returns null on the splash (`/`) and any non-city route.
 */
export function GlobeIntroHost() {
  const segment = useSelectedLayoutSegment()
  // Dev-mode skip: cobe's internal WebGL teardown throws inside React 19
  // StrictMode's dev-only effect double-invoke ("removeChild on canvas").
  // Production builds (which don't run StrictMode's simulate-unmount) are
  // unaffected — the intro renders correctly there. Honest trade: dev is
  // intro-less, prod is the shipping path.
  if (process.env.NODE_ENV !== 'production') return null
  if (!segment) return null
  const city = getCity(segment)
  if (!city) return null
  const [lng, lat] = city.mapCenter
  return <GlobeIntro key={city.id} cityName={city.name} target={[lat, lng]} />
}
