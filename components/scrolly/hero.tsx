import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-24 md:py-40">
      {/* Ambient heat shimmer — layered radial gradients, CSS-only */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: [
            'radial-gradient(ellipse 90% 60% at 50% -10%, oklch(0.55 0.18 42 / 0.18), transparent)',
            'radial-gradient(ellipse 60% 40% at 20% 80%, oklch(0.3 0.08 145 / 0.08), transparent)',
            'radial-gradient(ellipse 50% 30% at 80% 90%, oklch(0.45 0.12 30 / 0.07), transparent)',
          ].join(', '),
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        {/* Editorial kicker */}
        <p
          className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          April 2026 · Illustrative model · Bangalore
        </p>

        {/* Big editorial headline in Instrument Serif */}
        <h1
          className="mb-6 text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          Why did{' '}
          <span style={{ color: 'oklch(0.72 0.18 52)' }}>Bangalore</span>
          <br />
          get hot?
        </h1>

        {/* Dramatic stat subtitle */}
        <p
          className="mx-auto mb-4 max-w-2xl text-lg md:text-2xl text-muted-foreground leading-relaxed"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Surface temperature climbed{' '}
          <strong
            className="font-semibold"
            style={{ color: 'oklch(0.72 0.18 52)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4em' }}
          >
            +8°C
          </strong>{' '}
          in 50 years — driven by losing{' '}
          <strong className="text-foreground">91% of tree cover</strong>,{' '}
          <strong className="text-foreground">79% of wetlands</strong>, and a{' '}
          <strong className="text-foreground">1,055% expansion</strong> of concrete.
        </p>

        <p className="mx-auto mb-10 max-w-xl text-base text-muted-foreground">
          Move the sliders to see how each driver contributed — and what partial recovery looks like.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/simulator">
              Open the simulator <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">Read the caveats</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
