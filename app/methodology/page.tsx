import Link from 'next/link'
import { getAllCities } from '@/cities'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('City methodologies — Taap', 'Reference inputs, demonstration assumptions and limitations for each city.', '/methodology')

export default function Methodologies() {
  return <article className="mx-auto max-w-3xl px-4 py-16">
    <p className="eyebrow">Evidence and limitations</p>
    <h1 className="mt-4 font-display text-5xl italic">City methodologies</h1>
    <p className="my-6 text-muted-foreground">The simulator combines mixed-year reference inputs with unvalidated demonstration assumptions. Its temperature-equivalent response is not an air-temperature or land-surface-temperature forecast.</p>
    <ul className="grid gap-4 sm:grid-cols-2">{getAllCities().map(city => <li key={city.id}><Link className="block rounded-lg border p-5 underline underline-offset-4 hover:border-amber-200" href={`/${city.id}/about`}>{city.name}: inputs and assumptions</Link></li>)}</ul>
    <Link className="mt-8 inline-block underline" href="/engineering">How the software works</Link>
  </article>
}
