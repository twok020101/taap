import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { getAllCities } from '@/cities'
import { StructuredData } from '@/components/structured-data'
import { RESEARCH_REVIEWED, getResearch, research } from '@/lib/research'
import { absoluteUrl, breadcrumbs, pageMetadata } from '@/lib/seo'

export function generateStaticParams() { return research.map(({ slug }) => ({ slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const item = getResearch((await params).slug)
  if (!item) notFound()
  return pageMetadata(`${item.title}: urban cooling research | Taap`, `${item.summary} Evidence from ${item.paper.authors} (${item.paper.year}), with study context and model limits.`, `/research/${item.slug}`)
}

export default async function ResearchArticle({ params }: { params: Promise<{ slug: string }> }) {
  const item = getResearch((await params).slug)
  if (!item) notFound()
  const path = `/research/${item.slug}`
  return <article className="mx-auto max-w-5xl px-4 py-14">
    <StructuredData data={[breadcrumbs([{ name: 'Taap', path: '/' }, { name: 'Research', path: '/research' }, { name: item.title, path }]), { '@context': 'https://schema.org', '@type': 'Article', headline: item.title, description: item.summary, mainEntityOfPage: absoluteUrl(path), url: absoluteUrl(path), dateModified: RESEARCH_REVIEWED, author: { '@type': 'Organization', name: 'Taap', url: absoluteUrl() }, image: absoluteUrl('/opengraph-image'), citation: { '@type': 'ScholarlyArticle', name: item.paper.title, url: item.paper.url, identifier: `https://doi.org/${item.paper.doi}`, datePublished: String(item.paper.year), isPartOf: { '@type': 'Periodical', name: item.paper.journal } } }]}/>
    <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Link href="/">Taap</Link><span>/</span><Link href="/research">Research</Link><span>/</span><span aria-current="page">{item.title}</span></nav>
    <header className="py-12"><p className="eyebrow">{item.eyebrow}</p><h1 className="mt-5 font-display text-5xl italic leading-tight md:text-7xl">{item.title}</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{item.summary}</p><p className="mt-5 text-xs text-muted-foreground">Taap research notes · Reviewed <time dateTime={RESEARCH_REVIEWED}>20 September 2026</time> · {item.coverage}</p></header>
    <div className="grid items-start gap-10 md:grid-cols-[1.5fr_1fr]">
      <div className="space-y-10">{[
        ['The environmental mechanism', item.mechanism], ['What the study found', item.finding], ['Where the evidence stops', item.limitation], ['A local question to investigate', item.application], ['What you can explore in Taap', item.modelUse],
      ].map(([title, text]) => <section key={title}><h2 className="text-xl text-amber-100">{title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{text}</p></section>)}</div>
      <aside className="rounded-xl border border-border bg-card/40 p-6" aria-label="Source paper">
        <p className="eyebrow">The source, in context</p><h2 className="mt-4 text-lg leading-snug">{item.paper.title}</h2><p className="mt-3 text-sm text-muted-foreground">{item.paper.authors} · {item.paper.year}<br/>{item.paper.journal}</p>
        <dl className="my-6 space-y-4 text-sm">{[['Method', item.paper.method], ['Study setting', item.paper.geography], ['Measured or modelled', item.paper.metric], ['Source sections', item.paper.locator]].map(([label, text]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1">{text}</dd></div>)}</dl>
        <a href={item.paper.url} className="inline-flex items-center gap-2 text-sm text-emerald-200 underline underline-offset-4">Read the paper <ArrowUpRight size={15}/></a><p className="mt-4 break-all font-mono text-[10px] text-muted-foreground">DOI: <a href={`https://doi.org/${item.paper.doi}`}>{item.paper.doi}</a></p>
      </aside>
    </div>
    <section className="mt-14 border-t border-border pt-8"><h2 className="text-xl">Explore a city with this context</h2><p className="mt-2 text-sm text-muted-foreground">City selection does not imply that this paper calibrated that city’s model.</p><div className="mt-5 flex flex-wrap gap-3">{getAllCities().map(city => <Link key={city.id} href={`/${city.id}/simulator`} className="rounded-lg border border-border px-4 py-3 text-sm hover:bg-accent/30">{city.name} ↗</Link>)}</div></section>
    <Link href="/research" className="mt-10 inline-block text-sm text-amber-200">← All six approaches</Link>
  </article>
}
