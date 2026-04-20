'use client'

interface GlobeSpinnerProps {
  size?: number
  className?: string
}

/**
 * Tiny CSS-driven loader used as a Suspense fallback for the live-weather
 * pill. Replaces the former cobe-based WebGL spinner, which tripped the
 * same `removeChild` reconciliation race during navigation.
 */
export default function GlobeSpinner({ size = 24, className }: GlobeSpinnerProps) {
  const ringSize = size
  const borderWidth = Math.max(2, Math.round(size / 10))
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-block',
        width: ringSize,
        height: ringSize,
        borderRadius: '50%',
        border: `${borderWidth}px solid rgba(233, 163, 49, 0.18)`,
        borderTopColor: 'rgba(233, 163, 49, 0.95)',
        animation: 'taap-globe-spinner-rot 900ms linear infinite',
      }}
    >
      <style>{`
        @keyframes taap-globe-spinner-rot {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  )
}
