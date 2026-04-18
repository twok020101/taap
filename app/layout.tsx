import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import Link from 'next/link'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from '@/components/brand/header'
import { GlobeIntro } from '@/components/globe/globe-intro'
import { AmbientParticles } from '@/components/ambient/ambient-particles'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: 'Taap — Why Indian cities get hot',
  description:
    "Explore how Bangalore's tree loss, lake encroachment, and urban sprawl have driven its temperature up by 8°C since 1973 — and move the sliders to see what recovery looks like.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <TooltipProvider>
          {/* First-load globe intro — client component, mounts only on first session visit */}
          <GlobeIntro />

          {/* Sticky branded header */}
          <Header />

          {/* Ambient particle canvas + page content */}
          <AmbientParticles tempC={24}>
            <main style={{ position: 'relative', zIndex: 2 }}>{children}</main>
          </AmbientParticles>

          <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground" style={{ position: 'relative', zIndex: 2 }}>
            <p>
              Illustrative model only — not a forecast. All coefficients are
              correlation-based, not causal. See{' '}
              <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
                About
              </Link>{' '}
              for limitations and citations.
            </p>
          </footer>
        </TooltipProvider>
      </body>
    </html>
  )
}
