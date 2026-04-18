import Link from 'next/link'
import { Suspense } from 'react'
import { Logo } from './logo'
import { Wordmark } from './wordmark'
import { fetchBangaloreWeather } from '@/lib/sources/openMeteo'
import GlobeSpinner from '@/components/globe/globe-spinner'

async function WeatherPill() {
  try {
    const weather = await fetchBangaloreWeather()
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-mono text-foreground">{weather.tempC}°C</span>
        <span className="hidden sm:inline">{weather.summary}</span>
      </span>
    )
  } catch {
    return null
  }
}

function WeatherPillFallback() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
      <GlobeSpinner size={16} />
      <span className="font-mono">—°C</span>
    </span>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        {/* Left: logo + wordmark */}
        <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
          <Logo size={28} className="text-amber-400 shrink-0" />
          <Wordmark showTagline />
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Center-right: nav links */}
        <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/simulator" className="hover:text-foreground transition-colors">
            Simulator
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          {/* Future city switcher — placeholder */}
          <span className="text-muted-foreground/40 cursor-default select-none">
            Delhi <span className="text-[10px]">(soon)</span>
          </span>
        </div>

        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-3 text-sm text-muted-foreground">
          <Link href="/simulator" className="hover:text-foreground transition-colors">
            Sim
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
        </div>

        {/* Far right: live weather pill */}
        <Suspense fallback={<WeatherPillFallback />}>
          <WeatherPill />
        </Suspense>
      </nav>
    </header>
  )
}
