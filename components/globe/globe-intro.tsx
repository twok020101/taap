'use client'

import { useEffect, useRef, useState } from 'react'
import createGlobe, { type Globe } from 'cobe'
import { Logo } from '@/components/brand/logo'

interface GlobeIntroProps {
  /** City name shown under the globe. */
  cityName: string
  /** Target marker / camera — [lat, lng]. */
  target: [number, number]
  /** Dedup key — shown only once per session per key. */
  storageKey?: string
}

// Convert lat/long to cobe phi (longitude radians offset so front = 0)
function lngToPhi(lng: number): number {
  return ((lng - 180) * Math.PI) / 180
}
function latToTheta(lat: number): number {
  return ((90 - lat) * Math.PI) / 180
}

// Ease in-out cubic
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function GlobeIntro({ cityName, target, storageKey }: GlobeIntroProps) {
  const [targetLat, targetLng] = target
  const TARGET_PHI = lngToPhi(targetLng)
  const TARGET_THETA = latToTheta(targetLat)
  const dedupKey = storageKey ?? `taap-intro-seen-${cityName.toLowerCase()}`
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<Globe | null>(null)
  const rafRef = useRef<number>(0)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Only first visit each session per city
    if (sessionStorage.getItem(dedupKey)) return

    setMounted(true)
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [dedupKey])

  // Imperative canvas management — render the canvas outside React's
  // reconciliation so cobe's WebGL teardown doesn't race with React's DOM
  // diff during StrictMode's dev-mode double-invoke. React only owns the
  // host <div>; the canvas is a pure child of that div that we create,
  // cobe-manage, and remove ourselves.
  useEffect(() => {
    if (!mounted || !visible) return
    const host = canvasHostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    const devicePixelRatio = Math.min(window.devicePixelRatio, 2)
    const w = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8)
    canvas.width = w * devicePixelRatio
    canvas.height = w * devicePixelRatio
    canvas.style.width = `${w}px`
    canvas.style.height = `${w}px`
    canvas.style.borderRadius = '50%'
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)

    const startPhi = Math.PI
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
        { location: [targetLat, targetLng], size: 0.08 },
      ],
    })
    globeRef.current = globe

    function tick() {
      if (hasDismissed) return
      const elapsed = Date.now() - startTime

      if (elapsed < 1200) {
        currentPhi -= 0.015
        globe.update({ phi: currentPhi, theta: currentTheta })
      } else if (elapsed < 2800) {
        if (tweenStartPhi === null) { tweenStartPhi = currentPhi; tweenStartTheta = currentTheta }
        const t = Math.min((elapsed - 1200) / 1600, 1)
        const ease = easeInOut(t)
        const phi = tweenStartPhi + (TARGET_PHI - tweenStartPhi) * ease
        const theta = (tweenStartTheta ?? 0.3) + (TARGET_THETA - (tweenStartTheta ?? 0.3)) * ease
        currentPhi = phi
        currentTheta = theta
        globe.update({ phi, theta })
      } else {
        globe.update({ phi: TARGET_PHI, theta: TARGET_THETA })
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
      try { globe.destroy() } catch { /* ignore WebGL teardown race */ }
      globeRef.current = null
      if (canvas.parentNode === host) {
        try { host.removeChild(canvas) } catch { /* already detached */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, visible])

  const dismiss = () => {
    sessionStorage.setItem(dedupKey, '1')
    setVisible(false)
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
      {/* Globe host — canvas is imperatively managed inside this div */}
      <div
        ref={canvasHostRef}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: globeSize,
          height: globeSize,
        }}
      />

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
          {cityName}
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
