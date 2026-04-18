import { ImageResponse } from 'next/og'

export const alt = 'Taap — Why Indian cities get hot'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
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
              display: 'flex',
              flexDirection: 'column',
              fontSize: 104,
              lineHeight: 1.04,
              fontStyle: 'italic',
              color: '#ffe9c8',
              fontFamily: 'serif',
              letterSpacing: -2,
            }}
          >
            <span>Why Indian cities</span>
            <span>get hot</span>
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
          <div>Bangalore · Delhi · Mumbai · Chennai</div>
          <div style={{ fontSize: 18, color: '#83725a' }}>
            Illustrative simulator · peer-reviewed coefficients
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
