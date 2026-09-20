import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import Link from 'next/link'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from '@vercel/analytics/next'
import { Header } from '@/components/brand/header'
import { AmbientParticles } from '@/components/ambient/ambient-particles'
import { GlobeIntroHost } from '@/components/globe/globe-intro-host'
import { siteUrl } from '@/lib/seo'
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
  metadataBase: new URL(siteUrl),
  title: 'Taap — Why Indian cities get hot',
  description:
    "Explore how tree loss, wetland encroachment, and urban sprawl have driven Indian cities' temperatures up — and move the sliders to see what recovery looks like. Bangalore, Delhi, Mumbai, Chennai.",
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
          <a href="#main-content" className="fixed left-4 top-3 z-50 -translate-y-24 rounded-md bg-foreground px-4 py-3 text-sm text-background focus:translate-y-0">Skip to content</a>
          {/* Per-city globe intro — mounted at root so city navigations don't
              trigger an RSC layout remount (which races with cobe's WebGL
              cleanup in dev StrictMode). Renders null on the splash. */}
          <GlobeIntroHost />

          {/* Sticky branded header */}
          <Header />

          {/* Ambient particle canvas + page content */}
          <AmbientParticles tempC={24}>
            <main id="main-content" tabIndex={-1} style={{ position: 'relative', zIndex: 2 }}>{children}</main>
          </AmbientParticles>

          <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground" style={{ position: 'relative', zIndex: 2 }}>
            <p>
              Illustrative model only — not a forecast. Source applicability and coefficient derivations need review. Explore{' '}
              <Link href="/" className="underline underline-offset-2 hover:text-foreground">
                city methodologies
              </Link>{' '}
              for per-city caveats and citations.
            </p>
            <nav aria-label="Footer" className="mt-4 flex flex-wrap justify-center gap-5"><Link href="/research" className="hover:text-foreground">Research & evidence</Link><a href="/research.json" className="hover:text-foreground">Research data</a><a href="/llms.txt" className="hover:text-foreground">AI reading guide</a></nav>
          </footer>
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  )
}
