import { Info } from 'lucide-react'

export function HonestyInline({ cityId, waterAvailable }: { cityId: string; waterAvailable: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-amber-200/80">
        <strong className="text-amber-300">Illustrative, not predictive.</strong>{' '}
        Seasonal, wind, aerosol, and zone effects are simplified approximations.
        Street-level weather, future climate, implementation costs, and population effects
        are not modelled. Bands cover selected coefficient ranges, not all uncertainty.{' '}
        {!waterAvailable && 'Water-area data is unavailable for this city; its water-change contribution is omitted. '}
        <a href={`/${cityId}/about`} className="underline underline-offset-2 hover:text-amber-200">
          See full caveats →
        </a>
      </p>
    </div>
  )
}
