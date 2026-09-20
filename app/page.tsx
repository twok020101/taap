import Link from 'next/link'
import { getAllCities } from '@/cities'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { StreetScene } from '@/components/environment/street-scene'
import { ApproachCards } from '@/components/research/approach-cards'
import { StructuredData } from '@/components/structured-data'
import { cityStories } from '@/lib/research'
import { absoluteUrl, pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('Taap — Urban heat, environmental impact & cooler Indian cities', 'Explore how trees, water, buildings and transport shape urban heat and air quality in Bangalore, Delhi, Mumbai and Chennai. Research, interactive stories and an illustrative simulator.', '/')

export default function SplashPage() {
  return <div className="mx-auto max-w-6xl px-4 pb-20">
    <StructuredData data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Taap', url: absoluteUrl(), description: 'Research-informed urban heat education and illustrative simulations for four Indian cities.', inLanguage: 'en' }}/>
    <section className="relative py-16 md:py-24">
      <div className="pointer-events-none absolute -top-20 right-0 h-80 w-2/3 rounded-full bg-orange-400/5 blur-3xl" aria-hidden="true"/>
      <p className="eyebrow mb-6">Taap · तप · Heat has a landscape</p>
      <div className="grid gap-8 md:grid-cols-[1.45fr_1fr] md:items-end">
        <h1 className="font-display text-6xl italic leading-[1.02] tracking-tight md:text-8xl">The city changes.<br/><span className="text-amber-200">The heat stays.</span></h1>
        <div className="pb-1"><p className="max-w-md text-base leading-relaxed text-muted-foreground">A tree disappears. A lake shrinks. Another road holds the afternoon sun. Explore how our choices reshape the environment in Indian cities—and the research behind a cooler path.</p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm"><a href="#cities" className="inline-flex items-center gap-2 text-amber-200">Explore your city <ArrowRight size={16}/></a><Link href="/research" className="text-muted-foreground underline underline-offset-4">Follow the research</Link></div>
        </div>
      </div>
      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><span>04 Indian cities</span><span>06 research approaches</span><span>Illustrative models · Open sources</span></div>
    </section>
    <StreetScene/>
    <section id="cities" className="scroll-mt-28 py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">01 / Find your context</p><h2 className="section-title mt-3">One planet. Different city stories.</h2></div><p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Local baselines, historical land cover and scenarios you can change.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">{getAllCities().map((city, i) => <Link key={city.id} href={`/${city.id}`} className="group relative overflow-hidden rounded-xl border border-border bg-card/30 p-7 transition-colors hover:border-amber-200/50">
        <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-muted-foreground">0{i + 1} / {city.mapCenter[1].toFixed(2)}°N</span><ArrowUpRight className="text-amber-200 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" size={19}/></div>
        <h3 className="mt-8 font-display text-4xl italic">{city.name}</h3><p className="mt-3 text-sm text-muted-foreground">{cityStories[city.id].setting}</p>
      </Link>)}</div>
    </section>
    <section className="border-t border-border pt-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">02 / From papers to possibilities</p><h2 className="section-title mt-3">What could a cooler city look like?</h2></div><Link href="/research" className="inline-flex items-center gap-2 text-sm text-amber-200">Explore all the evidence <ArrowRight size={16}/></Link></div>
      <ApproachCards/>
    </section>
    <section className="mt-20 grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_2fr]" aria-labelledby="reading-title"><h2 id="reading-title" className="font-display text-3xl italic">Read the numbers<br/>with their limits.</h2><div className="grid gap-6 sm:grid-cols-3">{[
      ['Surface ≠ air', 'A hot road, the air above it and the heat a person feels are different measurements.'],
      ['Scenario ≠ forecast', 'Our sliders explore simplified relationships. They do not predict the temperature of your street.'],
      ['Research ≠ calibration', 'A paper can support a mechanism without validating the exact coefficient used in a model.'],
    ].map(([title, text]) => <div key={title}><h3 className="text-sm text-emerald-200">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</div></section>
  </div>
}
