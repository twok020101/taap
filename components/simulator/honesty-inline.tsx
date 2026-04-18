import { Info } from 'lucide-react'

export function HonestyInline() {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-amber-200/80">
        <strong className="text-amber-300">Illustrative, not predictive.</strong>{' '}
        This model uses linear regression coefficients from peer-reviewed studies.
        It cannot capture monsoon effects, advection, aerosol forcing, or spatial
        heterogeneity.{' '}
        <a href="/about" className="underline underline-offset-2 hover:text-amber-200">
          See full caveats →
        </a>
      </p>
    </div>
  )
}
