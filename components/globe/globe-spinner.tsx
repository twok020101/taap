'use client'

import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'

interface GlobeSpinnerProps {
  size?: number
  className?: string
}

/**
 * Tiny rotating globe loader. 24–32 px, no text. Works inline and in buttons.
 * Uses cobe v2 API (globe.update() instead of onRender callback).
 */
export default function GlobeSpinner({ size = 24, className }: GlobeSpinnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const devicePixelRatio = Math.min(window.devicePixelRatio, 2)
    const w = size * devicePixelRatio

    let phi = 0
    let rafId: number

    const globe = createGlobe(canvas, {
      devicePixelRatio,
      width: w,
      height: w,
      phi,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 4000,
      mapBrightness: 6,
      baseColor: [0.25, 0.18, 0.1],
      markerColor: [0.9, 0.55, 0.1],
      glowColor: [0.6, 0.35, 0.1],
      markers: [],
    })

    function tick() {
      phi += 0.012
      globe.update({ phi })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      globe.destroy()
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
      aria-hidden
    />
  )
}
