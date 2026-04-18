'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/components/brand/logo'

interface GlobeIntroProps {
  /** City name shown under the logo. */
  cityName: string
  /** Kept for API compatibility with the old cobe-based intro. Unused now. */
  target: [number, number]
  /** Dedup key — shown only once per session per key. */
  storageKey?: string
}

/**
 * WebGL-free intro splash. The previous `cobe`-driven 3D globe collided
 * with React 19's reconciler during `[city]` navigation: cobe mutates the
 * canvas WebGL context, and the follow-up reconciliation commit could not
 * reliably remove the canvas child, throwing `NotFoundError: Failed to
 * execute 'removeChild'` in both dev StrictMode and prod. Multiple
 * mitigations (didInitRef, try/catch, imperative canvas, root-layout
 * singleton, NODE_ENV dev-skip) each reduced the frequency without
 * eliminating the race — the throw originates inside cobe on a queued
 * microtask that outlives React's synchronous try/catch window.
 *
 * This version keeps the brand beat (logo + city name + tagline, fades
 * over ~2.6 s, click-to-skip, sessionStorage dedup, prefers-reduced-motion
 * respected) but drops the canvas entirely. The DOM is plain React JSX,
 * so the reconciler owns every node and nothing fights it.
 */
export function GlobeIntro({ cityName, storageKey }: GlobeIntroProps) {
  const dedupKey = storageKey ?? `taap-intro-seen-${cityName.toLowerCase()}`
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (sessionStorage.getItem(dedupKey)) return

    setMounted(true)
    const fadeIn = setTimeout(() => setVisible(true), 50)
    const autoDismiss = setTimeout(() => {
      sessionStorage.setItem(dedupKey, '1')
      setVisible(false)
    }, 2400)
    return () => {
      clearTimeout(fadeIn)
      clearTimeout(autoDismiss)
    }
  }, [dedupKey])

  const dismiss = () => {
    sessionStorage.setItem(dedupKey, '1')
    setVisible(false)
  }

  if (!mounted) return null

  return (
    <div
      role="dialog"
      aria-label="Taap intro"
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
      {/* Logo pulse — replaces the former globe */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'min(38vw, 38vh)',
          height: 'min(38vw, 38vh)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 50% 50%, oklch(0.32 0.12 55 / 0.55) 0%, oklch(0.18 0.06 40 / 0) 70%)',
            animation: 'taap-intro-pulse 2400ms ease-out both',
          }}
        />
        <Logo size={120} className="text-amber-400" />
        <style>{`
          @keyframes taap-intro-pulse {
            0% { transform: scale(0.78); opacity: 0.0; }
            30% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1.32); opacity: 0; }
          }
        `}</style>
      </div>

      {/* Caption */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '2rem',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            marginBottom: '0.5rem',
          }}
        >
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
