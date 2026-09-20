import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { research } from '@/lib/research'

export function ApproachCards({ slugs }: { slugs?: string[] }) {
  const items = slugs ? slugs.flatMap(slug => research.filter(item => item.slug === slug)) : research
  return <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
    {items.map(item => <article key={item.slug} className="flex flex-col bg-background p-6 md:p-8">
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-300">{item.eyebrow}</p>
      <h3 className="mt-5 text-2xl tracking-tight"><Link className="hover:text-amber-200" href={`/research/${item.slug}`}>{item.title}</Link></h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
      <p className="mt-6 text-xs text-muted-foreground">{item.paper.authors} · {item.paper.year} · {item.paper.journal}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">{item.coverage}</span>
        <Link href={`/research/${item.slug}`} className="inline-flex items-center gap-1 text-amber-200">Read the evidence <ArrowUpRight size={14} /></Link>
      </div>
    </article>)}
  </div>
}
