import { ImageResponse } from 'next/og'
import { getCity } from '@/cities'

export const alt = 'Taap — city heat simulator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: cityId } = await params
  const city = getCity(cityId)
  const cityName = city?.name ?? 'Taap'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(ellipse at 30% 20%, oklch(0.28 0.12 55) 0%, oklch(0.12 0.04 40) 55%, oklch(0.06 0.02 35) 100%)',
          padding: 80,
          color: '#f5e9d6',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: '#cba271',
            }}
          >
            Taap · तप · heat
          </div>
          <div
            style={{
              fontSize: 128,
              lineHeight: 1.02,
              fontStyle: 'italic',
              color: '#ffe9c8',
              fontFamily: 'serif',
              letterSpacing: -3,
            }}
          >
            {cityName}
          </div>
          <div
            style={{
              fontSize: 36,
              fontStyle: 'italic',
              color: '#e8c58e',
              fontFamily: 'serif',
              marginTop: -4,
            }}
          >
            Why it gets hot
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: 24,
            color: '#b49a77',
          }}
        >
          <div>Interactive heat simulator · 1973 → 2026</div>
          <div style={{ fontSize: 18, color: '#83725a' }}>
            Peer-reviewed coefficients · live IMD / CPCB / GFW data
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
