import { Fragment } from 'react'
import Image from 'next/image'
import type { CityConfig } from '@/cities/types'

const YEARS = ['1973', '2000', '2024', '2026'] as const

const COLUMN_HEADERS: Record<string, string> = {
  '1973': '1973',
  '2000': '2000',
  '2024': '2024',
  '2026': '2026 (Q1)',
}

const ROW_META = [
  {
    rowLabel: 'NDVI (greenness)',
    key: 'ndvi',
    captions: {
      '1973': '1973 · pre-satellite',
      '2000': 'Apr 2000 · MODIS NDVI',
      '2024': 'Apr 2024 · MODIS NDVI',
      '2026': 'Mar 2026 · MODIS NDVI',
    },
  },
  {
    rowLabel: 'LST (land surface temp)',
    key: 'lst',
    captions: {
      '1973': '1973 · pre-satellite',
      '2000': 'Apr 2000 · MODIS LST',
      '2024': 'Apr 2024 · MODIS LST',
      '2026': 'Mar 2026 · MODIS LST',
    },
  },
] as const

function PreSatelliteTile() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-muted/30 px-2 py-2 text-center">
      <p className="text-[11px] italic text-muted-foreground">Pre-satellite</p>
      <p className="mt-1 text-[9px] italic text-muted-foreground/70 leading-tight">
        See IISc LULC<br />reconstruction below
      </p>
    </div>
  )
}

export function RasterStrip({ city }: { city: CityConfig }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      {/* Section heading */}
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Satellite record
        </p>
        <h2
          className="text-4xl md:text-5xl tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          Greenness lost, heat gained
        </h2>
        <p className="mt-3 text-muted-foreground">
          Monthly composites showing NDVI (vegetation) and LST (surface temperature) across five
          decades.
        </p>
      </div>

      {/* Grid: 1 label col + 4 data cols */}
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-3">
        {/* Top-left empty cell */}
        <div />

        {/* Column year headers */}
        {YEARS.map((yr) => (
          <div key={yr} className="text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
              style={{ fontFamily: 'var(--font-mono)' }}>
              {COLUMN_HEADERS[yr]}
            </span>
          </div>
        ))}

        {/* Rows */}
        {ROW_META.map((row) => (
          <Fragment key={row.key}>
            {/* Row label */}
            <div className="flex items-center pr-2">
              <span
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground rotate-0"
                style={{ fontFamily: 'var(--font-mono)', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
              >
                {row.rowLabel}
              </span>
            </div>

            {/* Image or pre-satellite tiles */}
            {YEARS.map((yr) => (
              <div key={`${row.key}-${yr}`} className="flex flex-col gap-1">
                <div className="relative overflow-hidden rounded-lg border border-border aspect-[1024/820]">
                  {yr === '1973' ? (
                    <PreSatelliteTile />
                  ) : (
                    <Image
                      src={`/rasters/${city.id}/${yr}-${row.key}.png`}
                      alt={row.captions[yr]}
                      width={1024}
                      height={820}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="text-center text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {row.captions[yr]}
                </p>
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      {/* Source credit */}
      <p className="mt-6 text-center text-xs italic text-muted-foreground/60">
        NASA EOSDIS GIBS · MODIS Terra monthly composites · 1 km native resolution
      </p>
    </section>
  )
}
