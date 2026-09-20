import Link from 'next/link'
import { ApproachCards } from '@/components/research/approach-cards'
import { StructuredData } from '@/components/structured-data'
import { RESEARCH_REVIEWED, research } from '@/lib/research'
import { absoluteUrl, breadcrumbs, pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('Urban cooling research: six approaches & their evidence | Taap', 'Peer-reviewed research on tree canopy, blue-green infrastructure, cool roofs, transport and cooling equity. Study methods, environmental effects and limits for Indian cities.', '/research')

export default function ResearchPage() {
  return <div className="mx-auto max-w-6xl px-4 py-16">
    <StructuredData data={[breadcrumbs([{ name: 'Taap', path: '/' }, { name: 'Research', path: '/research' }]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Urban cooling research', url: absoluteUrl('/research'), mainEntity: { '@type': 'ItemList', itemListElement: research.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: absoluteUrl(`/research/${item.slug}`) })) } }]}/>
    <nav aria-label="Breadcrumb" className="mb-10 text-xs text-muted-foreground"><Link href="/" className="hover:text-foreground">Taap</Link> / Research</nav>
    <p className="eyebrow">The evidence library</p>
    <h1 className="mt-5 max-w-3xl font-display text-5xl italic leading-tight md:text-7xl">A cooler city starts<br/>with better questions.</h1>
    <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">Six approaches grounded in peer-reviewed papers. Follow the mechanism, inspect the study and see where the evidence stops. These are research summaries and questions for local investigation, not a ranking of universally effective solutions.</p>
    <p className="mt-4 text-xs text-muted-foreground">Curated by Taap · Sources reviewed <time dateTime={RESEARCH_REVIEWED}>20 September 2026</time></p>
    <div className="my-10 grid gap-6 rounded-xl border border-border bg-card/30 p-6 text-sm sm:grid-cols-3">
      <div><h2 className="text-emerald-200">Evidence first</h2><p className="mt-2 leading-relaxed text-muted-foreground">Each approach links to a paper, identifies its method and states the temperature or pollution metric.</p></div>
      <div><h2 className="text-amber-200">Context always</h2><p className="mt-2 leading-relaxed text-muted-foreground">Field measurements, satellite observations and numerical experiments answer different questions.</p></div>
      <div><h2 className="text-foreground">Model limits visible</h2><p className="mt-2 leading-relaxed text-muted-foreground">A research citation does not validate Taap’s coefficients. Roofs, runoff, carbon and health outcomes are not simulated.</p></div>
    </div>
    <ApproachCards/>
    <section className="mt-16 max-w-3xl space-y-6" aria-labelledby="research-faq"><h2 id="research-faq" className="section-title">How to use this evidence</h2>
      <div><h3 className="text-lg">Can I add the cooling benefits from different papers?</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">No. Different baselines, time periods, climates and measurements make those numbers incompatible. Interventions also interact. Taap’s additive model is an educational simplification.</p></div>
      <div><h3 className="text-lg">Does a cooler surface mean the same drop in air temperature?</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">No. Surface temperature describes roofs, roads or vegetation. Near-surface air temperature measures the air. Thermal comfort also depends on humidity, wind and radiation. Each paper’s metric is labelled.</p></div>
      <div><h3 className="text-lg">How were these pages prepared?</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">AI-assisted summaries were checked against the linked source text or abstract. Taap’s suggested local applications are interpretations, not recommendations issued by the paper authors. This is a curated reading list, not an exhaustive systematic review.</p></div>
    </section>
    <p className="mt-12 text-xs text-muted-foreground">For reuse: <a href="/research.json" className="underline underline-offset-4">structured research index</a> · <a href="/llms.txt" className="underline underline-offset-4">plain-text site guide</a></p>
  </div>
}
