import type { CityConfig } from '@/cities/types'
import { bangalore } from '@/cities/bangalore'

export interface TreeLossYear {
  year: number
  lossHa: number
}

export interface TreeLoss {
  latestYear: number
  latestLossHa: number
  cumulativeLossHa: number
  byYear: TreeLossYear[]
}

function buildSql(iso: string, adm1: number, adm2: number): string {
  return (
    `SELECT umd_tree_cover_loss__year, SUM(umd_tree_cover_loss__ha) as loss_ha` +
    ` FROM data` +
    ` WHERE iso='${iso}' AND adm1=${adm1} AND adm2=${adm2} AND umd_tree_cover_density_2000__threshold = 10` +
    ` GROUP BY umd_tree_cover_loss__year` +
    ` ORDER BY umd_tree_cover_loss__year`
  )
}

function buildUrl(iso: string, adm1: number, adm2: number): string {
  return (
    `https://data-api.globalforestwatch.org/dataset/gadm__tcl__adm2_change/latest/query` +
    `?sql=${encodeURIComponent(buildSql(iso, adm1, adm2))}`
  )
}

interface GfwRow {
  umd_tree_cover_loss__year: number
  loss_ha: number
}

interface GfwResponse {
  data: GfwRow[]
  status: string
}

function isGfwRow(v: unknown): v is GfwRow {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.umd_tree_cover_loss__year === 'number' &&
    typeof r.loss_ha === 'number'
  )
}

function isGfwResponse(data: unknown): data is GfwResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.data)) return false
  if (typeof d.status !== 'string') return false
  return d.data.every(isGfwRow)
}

export async function fetchTreeLoss(city: CityConfig): Promise<TreeLoss | null> {
  if (!city.gadm) return null
  const { iso, adm1, adm2 } = city.gadm
  const url = buildUrl(iso, adm1, adm2)

  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
      headers: { 'x-api-key': process.env.GFW_API_KEY ?? '' },
    })

    if (!res.ok) return null

    const raw: unknown = await res.json()

    if (!isGfwResponse(raw) || raw.data.length === 0) return null

    const byYear: TreeLossYear[] = raw.data.map((row) => ({
      year: row.umd_tree_cover_loss__year,
      lossHa: row.loss_ha,
    }))

    const latestEntry = byYear.reduce((a, b) => (b.year > a.year ? b : a))
    const cumulativeRaw = byYear.reduce((sum, r) => sum + r.lossHa, 0)

    return {
      latestYear: latestEntry.year,
      latestLossHa: Math.round(latestEntry.lossHa * 10) / 10,
      cumulativeLossHa: Math.round(cumulativeRaw),
      byYear,
    }
  } catch {
    return null
  }
}

/** Back-compat shim. */
export const fetchBangaloreTreeLoss = () => fetchTreeLoss(bangalore)
