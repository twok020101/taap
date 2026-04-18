'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: number
  suffix: string
  source: string
  /** Accent color for the large number */
  accent?: 'orange' | 'red' | 'amber' | 'default'
  /** When true, formats value with toLocaleString and no count-up animation (for fractional live values) */
  liveValue?: boolean
}

function useCountUp(target: number, duration = 1800) {
  const [current, setCurrent] = useState(0)
  const startedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const start = () => {
    if (startedRef.current) return
    startedRef.current = true
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { current, start }
}

export function StatCard({ label, value, suffix, source, accent = 'default', liveValue = false }: StatCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { current, start } = useCountUp(liveValue ? 0 : value)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [start])

  const accentClass =
    accent === 'orange'
      ? 'text-orange-400'
      : accent === 'red'
      ? 'text-red-400'
      : accent === 'amber'
      ? 'text-amber-400'
      : 'text-foreground'

  return (
    <div ref={containerRef}>
      <Card className="flex h-full flex-col justify-between transition-all duration-300 hover:border-border">
        <CardContent className="p-6">
          <div className={`mb-2 text-5xl font-bold tabular-nums tracking-tight ${accentClass}`}>
            {liveValue ? value.toLocaleString() : current.toLocaleString()}
            {suffix}
          </div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{source}</p>
        </CardContent>
      </Card>
    </div>
  )
}
