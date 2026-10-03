import { Info } from 'lucide-react'

export function HonestyInline({ cityId, waterAvailable }: { cityId: string; waterAvailable: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-amber-200/80">
        <strong className="text-amber-300">Illustrative, not predictive.</strong>{' '}
        Temperature-equivalent responses and PM2.5 scenarios use demo assumptions with unverified magnitudes. They are not observed or predicted air or surface temperatures. Seasonal, wind, aerosol, and zone effects are simplified.
        Street-level weather, future climate, implementation costs, and population effects
        are not modelled. Ranges show sensitivity to selected assumptions, not confidence intervals or all uncertainty.{' '}
        {!waterAvailable && 'Water-area data is unavailable for this city; its water-change contribution is omitted. '}
        <a href={`/${cityId}/about`} className="underline underline-offset-2 hover:text-amber-200">
          See full caveats →
        </a>
      </p>
    </div>
  )
}
