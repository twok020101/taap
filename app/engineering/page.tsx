import Link from 'next/link'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('Engineering Taap — Architecture, tradeoffs and reproducibility', 'A factual engineering case study: deterministic scenarios, an optional AI layer, reproducible URLs and honest model limits.', '/engineering')

const sections = [
  ['Problem and scope', 'Make environmental mechanisms explorable without presenting software correctness as scientific validation. Four typed city configurations share a scenario engine, guided experiments and a research library. Numerical magnitudes are demonstration assumptions, not validated city forecasts.'],
  ['Deterministic core, optional AI', 'Pure TypeScript functions compute outcomes and paired differences. Jev interprets bounded natural-language requests and checks conclusions against supplied evidence; it does not generate the numerical result. API credentials remain server-side. Guided comparisons and sliders work without an AI key or when the service fails.'],
  ['Reproducible state', 'A versioned URL hash stores controls, climate context and comparison inputs. Parsing validates and bounds incoming state. Applying a comparison updates its proposed controls together; reopening its URL reconstructs the same deterministic scenario. Browser history restoration and clipboard fallback are part of the demo flow.'],
  ['Rendering and failure modes', 'Next.js server components deliver city and research content. Client components handle state and interaction. MapLibre renders a generated grid with per-cell feature-state updates; it is an illustrative zone/feature pattern, not remote sensing. A non-WebGL fallback keeps numerical results accessible. External weather and air-quality feeds are contextual and may be unavailable.'],
  ['Tradeoffs made visible', 'Selected coefficient endpoints are propagated deterministically rather than sampled with Monte Carlo. They show sensitivity to chosen assumptions, not a confidence interval. Clamping bounds the demonstration; raw values and saturation are exposed because a collapsed band cannot imply certainty. Mixed-year inputs are labelled separately from current weather.'],
  ['Verification and limits', 'Unit tests cover scenario constraints, paired comparisons, missing water, AI boundaries, state serialization and evidence disclosures. Lint, TypeScript and a production build check the implementation. End-to-end tests exercise browser interactions. These are software checks, not validation against held-out temperature observations; no performance benchmark or predictive accuracy is claimed.'],
]

export default function Engineering() {
  return <article className="mx-auto max-w-3xl px-4 py-16">
    <p className="eyebrow">Engineering case study</p>
    <h1 className="mt-4 font-display text-5xl italic">Building an honest interactive model</h1>
    <p className="mt-6 text-lg text-muted-foreground">Taap turns an assumption-driven model into a reproducible, inspectable web demonstration.</p>
    <nav className="my-8 flex flex-wrap gap-5 text-sm" aria-label="Engineering resources"><Link className="underline" href="/bangalore/simulator">Try a guided comparison</Link><a className="underline" href="https://github.com/twok020101/taap">Read the code</a><Link className="underline" href="/methodology">Inspect assumptions</Link></nav>
    <div className="space-y-9">{sections.map(([title, body]) => <section key={title}><h2 className="text-xl font-medium">{title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{body}</p></section>)}</div>
    <p className="mt-10 border-t pt-6 text-sm text-muted-foreground">Reproduce locally using the commands and browser test instructions in the <a className="underline" href="https://github.com/twok020101/taap/blob/main/docs/engineering.md">repository case study</a>. Test results belong to the specific commit tested.</p>
  </article>
}
