'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from './logo'
import { Wordmark } from './wordmark'
import { getAllCities, cityIds } from '@/cities'
import GlobeSpinner from '@/components/globe/globe-spinner'

function WeatherPill({ cityId }: { cityId: string | null }) {
  const [data, setData] = useState<{ tempC: number; summary: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (!cityId) {
      setData(null)
      setLoading(false)
      return
    }
    fetch(`/api/weather?city=${cityId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((w) => {
        if (!cancelled && w && typeof w.tempC === 'number') {
          setData({ tempC: w.tempC, summary: w.summary ?? '' })
        } else if (!cancelled) {
          setData(null)
        }
      })
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [cityId])

  if (!cityId) return null
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
        <GlobeSpinner size={16} />
        <span className="font-mono">—°C</span>
      </span>
    )
  }
  if (!data) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      <span className="font-mono text-foreground">{data.tempC}°C</span>
      <span className="hidden sm:inline">{data.summary}</span>
    </span>
  )
}

export function Header() {
  const activeCity = useSelectedLayoutSegment() // 'bangalore' | 'delhi' | ... | null (for /)
  const validCity = activeCity && cityIds.includes(activeCity) ? activeCity : null
  const cities = getAllCities()

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
        >
          <Logo size={28} className="text-amber-400 shrink-0" />
          <Wordmark showTagline />
        </Link>

        <div className="flex-1" />

        {/* City switcher */}
        <div className="hidden md:flex items-center gap-1 text-xs">
          {cities.map((c) => (
            <Link
              key={c.id}
              href={`/${c.id}`}
              className={[
                'rounded-md px-2.5 py-1 transition-colors',
                c.id === validCity
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              ].join(' ')}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Sim / About links (only when a city is active) */}
        {validCity && (
          <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground pl-2 border-l border-border/50 ml-1">
            <Link
              href={`/${validCity}/simulator`}
              className="hover:text-foreground transition-colors"
            >
              Simulator
            </Link>
            <Link
              href={`/${validCity}/about`}
              className="hover:text-foreground transition-colors"
            >
              About
            </Link>
          </div>
        )}

        <WeatherPill cityId={validCity} />
      </nav>
    </header>
  )
}
