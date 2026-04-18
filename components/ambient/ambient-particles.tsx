'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

// ── Context for sharing tempC across the tree without double-canvas ──────────

interface AmbientContextValue {
  setTempC: (temp: number) => void
}

const AmbientContext = createContext<AmbientContextValue | null>(null)

export function useAmbientTemp(temp: number) {
  const ctx = useContext(AmbientContext)
  useEffect(() => {
    if (ctx) ctx.setTempC(temp)
  }, [ctx, temp])
}

// ── Particle types ───────────────────────────────────────────────────────────

type ParticleType = 'snow' | 'leaf' | 'dust' | 'ember'

function getParticleType(tempC: number): ParticleType {
  if (tempC < 20) return 'snow'
  if (tempC < 28) return 'leaf'
  if (tempC <= 35) return 'dust'
  return 'ember'
}

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  targetOpacity: number
  hue: number
  drift: number
  angle: number
  flicker: number
  type: ParticleType
}

function makeParticle(type: ParticleType, w: number, h: number, initial = false): Particle {
  const base: Omit<Particle, 'hue' | 'speed' | 'size' | 'drift' | 'flicker'> = {
    x: Math.random() * w,
    y: initial ? Math.random() * h : (type === 'snow' || type === 'leaf' ? -20 : h + 20),
    opacity: 0,
    targetOpacity: 0.35 + Math.random() * 0.25,
    angle: Math.random() * Math.PI * 2,
    type,
  }

  switch (type) {
    case 'snow':
      return { ...base, size: 2 + Math.random() * 3, speed: 0.4 + Math.random() * 0.6, hue: 200, drift: (Math.random() - 0.5) * 0.4, flicker: 0 }
    case 'leaf':
      return { ...base, size: 3 + Math.random() * 4, speed: 0.5 + Math.random() * 0.8, hue: 80 + Math.random() * 40, drift: (Math.random() - 0.5) * 0.8, flicker: 0 }
    case 'dust':
      return { ...base, size: 1.5 + Math.random() * 2, speed: -(0.2 + Math.random() * 0.4), hue: 45, drift: (Math.random() - 0.5) * 0.3, flicker: 0 }
    case 'ember':
      return { ...base, size: 1 + Math.random() * 2, speed: -(0.8 + Math.random() * 1.2), hue: 15 + Math.random() * 25, drift: (Math.random() - 0.5) * 0.5, flicker: Math.random() * Math.PI * 2 }
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save()
  ctx.globalAlpha = p.opacity

  switch (p.type) {
    case 'snow': {
      ctx.fillStyle = `hsl(${p.hue}, 60%, 90%)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'leaf': {
      ctx.fillStyle = `hsl(${p.hue}, 55%, 45%)`
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle)
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'dust': {
      ctx.fillStyle = `hsl(${p.hue}, 45%, 70%)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'ember': {
      const flicker = Math.sin(p.flicker)
      const r = p.size * (0.8 + flicker * 0.2)
      ctx.fillStyle = `hsl(${p.hue}, 90%, ${55 + flicker * 15}%)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, r / 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }

  ctx.restore()
}

// ── Canvas component ─────────────────────────────────────────────────────────

interface CanvasParticlesProps {
  tempC: number
  density?: number
}

function CanvasParticles({ tempC, density = 0.5 }: CanvasParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const currentTypeRef = useRef<ParticleType>(getParticleType(tempC))

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (document.visibilityState !== 'visible') {
      animFrameRef.current = requestAnimationFrame(animate)
      return
    }

    const w = canvas.width
    const h = canvas.height
    const type = currentTypeRef.current

    ctx.clearRect(0, 0, w, h)

    for (const p of particlesRef.current) {
      // Fade in/out
      if (p.opacity < p.targetOpacity) p.opacity = Math.min(p.opacity + 0.01, p.targetOpacity)
      else if (p.type !== type) {
        // Fade out stale particles
        p.opacity = Math.max(0, p.opacity - 0.015)
        p.targetOpacity = 0
      }

      // Movement
      p.y += p.speed
      p.x += p.drift
      p.angle += 0.02
      if (p.type === 'ember') p.flicker += 0.1

      // Wrap/reset when out of bounds
      const gone = p.type === 'snow' || p.type === 'leaf' ? p.y > h + 20 : p.y < -20
      if (gone || (p.type !== type && p.opacity <= 0)) {
        Object.assign(p, makeParticle(type, w, h))
      }

      drawParticle(ctx, p)
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const type = getParticleType(tempC)
    currentTypeRef.current = type
    const count = Math.round(30 + density * 20)
    particlesRef.current = Array.from({ length: count }, () =>
      makeParticle(type, canvas.width, canvas.height, true)
    )

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const newType = getParticleType(tempC)
    if (newType !== currentTypeRef.current) {
      currentTypeRef.current = newType
      // Mark all particles to fade and refresh to new type
      for (const p of particlesRef.current) {
        p.targetOpacity = 0
      }
    }
  }, [tempC])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 0.5 }}
      aria-hidden
    />
  )
}

// ── Public API ───────────────────────────────────────────────────────────────

interface AmbientParticlesProps {
  tempC: number
  density?: number
  children?: React.ReactNode
}

/**
 * Root provider component. Renders one canvas and exposes setTempC context
 * so child pages (e.g. simulator) can update the temperature without
 * mounting a second canvas.
 *
 * Usage in layout:
 *   <AmbientParticles tempC={24}>{children}</AmbientParticles>
 *
 * Usage in a page that knows the real temp:
 *   useAmbientTemp(output.tempC)  // exported hook
 */
export function AmbientParticles({ tempC: initialTemp, density, children }: AmbientParticlesProps) {
  // Respect prefers-reduced-motion
  const [reduced, setReduced] = useState(false)
  const [tempC, setTempC] = useState(initialTemp)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const handleSetTempC = useCallback((t: number) => {
    setTempC(t)
  }, [])

  return (
    <AmbientContext.Provider value={{ setTempC: handleSetTempC }}>
      {!reduced && <CanvasParticles tempC={tempC} density={density} />}
      {children}
    </AmbientContext.Provider>
  )
}
