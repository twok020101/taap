import { research, RESEARCH_REVIEWED } from '@/lib/research'
import { absoluteUrl } from '@/lib/seo'

export const dynamic = 'force-static'
export function GET() {
  return Response.json({ title: 'Taap urban cooling research', reviewed: RESEARCH_REVIEWED, scope: 'Curated research summaries, not a coefficient calibration dataset. Suggested applications are Taap interpretations. Model outputs are illustrative, not forecasts.', approaches: research.map(item => ({ ...item, page: absoluteUrl(`/research/${item.slug}`) })) }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
