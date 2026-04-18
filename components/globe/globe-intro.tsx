'use client'

import { useEffect, useRef, useState } from 'react'
import createGlobe, { type Globe } from 'cobe'
import { Logo } from '@/components/brand/logo'

// Bangalore coordinates
const BANGALORE_LAT = 12.9716
const BANGALORE_LNG = 77.5946

// Convert lat/long to cobe phi (longitude radians offset so front = 0)
function lngToPhi(lng: number): number {
  return ((lng - 180) * Math.PI) / 180
}
function latToTheta(lat: number): number {
  return ((90 - lat) * Math.PI) / 180
}

const BANGALORE_PHI = lngToPhi(BANGALORE_LNG)
const BANGALORE_THETA = latToTheta(BANGALORE_LAT)

// Ease in-out cubic
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function GlobeIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const globeRef = useRef<Globe | null>(null)
  const rafRef = useRef<number>(0)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Only first visit each session
    if (sessionStorage.getItem('taap-intro-seen')) return

    setMounted(true)
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!mounted || !visible) return
    const canvas = canvasRef.current
    if (!canvas) return

    const devicePixelRatio = Math.min(window.devicePixelRatio, 2)
    const w = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8)
    canvas.width = w * devicePixelRatio
    canvas.height = w * devicePixelRatio

    const startPhi = Math.PI   // start pointing away — never mutated
    let currentPhi = startPhi
    let currentTheta = 0.3
    let tweenStartPhi: number | null = null
    let tweenStartTheta: number | null = null
    const startTime = Date.now()
    let hasDismissed = false

    const globe = createGlobe(canvas, {
      devicePixelRatio,
      width: w * devicePixelRatio,
      height: w * devicePixelRatio,
      phi: startPhi,
      theta: 0.3,
      dark: 1,
      diffuse: 1.1,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.18, 0.12, 0.08],
      markerColor: [1.0, 0.6, 0.1],
      glowColor: [0.7, 0.4, 0.15],
      markers: [
        { location: [BANGALORE_LAT, BANGALORE_LNG], size: 0.08 },
      ],
    })
    globeRef.current = globe

    function tick() {
      if (hasDismissed) return
      const elapsed = Date.now() - startTime

      if (elapsed < 1200) {
        // Free rotation
        currentPhi -= 0.015
        globe.update({ phi: currentPhi, theta: currentTheta })
      } else if (elapsed < 2800) {
        // Snapshot tween origin once on first entry
        if (tweenStartPhi === null) { tweenStartPhi = currentPhi; tweenStartTheta = currentTheta }
        // Tween to Bangalore
        const t = Math.min((elapsed - 1200) / 1600, 1)
        const ease = easeInOut(t)
        const phi = tweenStartPhi + (BANGALORE_PHI - tweenStartPhi) * ease
        const theta = (tweenStartTheta ?? 0.3) + (BANGALORE_THETA - (tweenStartTheta ?? 0.3)) * ease
        currentPhi = phi
        currentTheta = theta
        globe.update({ phi, theta })
      } else {
        // Hold on Bangalore
        globe.update({ phi: BANGALORE_PHI, theta: BANGALORE_THETA })
        if (elapsed > 3000 && !hasDismissed) {
          hasDismissed = true
          dismiss()
          return
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      globe.destroy()
      globeRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, visible])

  const dismiss = () => {
    sessionStorage.setItem('taap-intro-seen', '1')
    setVisible(false)
    setTimeout(() => setMounted(false), 700)
  }

  if (!mounted) return null

  const globeSize = 'min(80vw, 80vh)'

  return (
    <div
      role="dialog"
      aria-label="Taap globe intro"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'oklch(0.08 0.02 35 / 0.97)',
        cursor: 'pointer',
        transition: 'opacity 600ms ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Globe canvas */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: globeSize,
            height: globeSize,
            borderRadius: '50%',
          }}
          aria-hidden
        />
      </div>

      {/* Overlay text below globe */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '2rem',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Logo size={40} className="text-amber-400" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontStyle: 'italic',
              color: 'oklch(0.93 0.05 55)',
              lineHeight: 1,
            }}
          >
            Taap
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.85rem',
            color: 'oklch(0.7 0.05 50)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '0.2rem',
          }}
        >
          Bangalore
        </p>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.72rem',
            color: 'oklch(0.55 0.03 50)',
            letterSpacing: '0.06em',
          }}
        >
          Why Indian cities get hot
        </p>
      </div>

      {/* Skip hint */}
      <p
        style={{
          position: 'absolute',
          bottom: '2rem',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.72rem',
          color: 'oklch(0.45 0.02 50)',
          letterSpacing: '0.08em',
        }}
      >
        Click anywhere to skip
      </p>
    </div>
  )
}
