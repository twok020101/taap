import test from 'node:test'
import assert from 'node:assert/strict'
import { getSiteUrl, serializeJsonLd } from '../lib/seo'
import { research, cityStories } from '../lib/research'
import { cityIds } from '../cities'
import sitemap from '../app/sitemap'
import { GET as researchIndex } from '../app/research.json/route'
import { GET as readingGuide } from '../app/llms.txt/route'

test('canonical origin prefers the public domain and never uses a Vercel preview URL', () => {
  assert.equal(getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://example.org/path/', VERCEL_URL: 'preview.vercel.app' }), 'https://example.org')
  assert.equal(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'production.vercel.app', VERCEL_URL: 'preview.vercel.app' }), 'https://taap.thetwok.in')
  assert.equal(getSiteUrl({ VERCEL_URL: 'preview.vercel.app' }), 'https://taap.thetwok.in')
  assert.throws(() => getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'javascript:alert(1)' }))
  assert.throws(() => getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://secret@example.org' }))
})

test('structured data cannot break out of its script element', () => {
  const data = { text: '</script><script>alert(1)</script>' }
  const encoded = serializeJsonLd(data)
  assert.ok(!encoded.includes('<'))
  assert.deepEqual(JSON.parse(encoded), data)
})

test('research and city references resolve to unique, crawlable pages', () => {
  const slugs = new Set(research.map(item => item.slug))
  assert.equal(slugs.size, research.length)
  assert.equal(new Set(research.map(item => item.paper.doi)).size, research.length)
  for (const city of cityIds) for (const slug of cityStories[city].approaches) assert.ok(slugs.has(slug))
  const paths = sitemap().map(item => new URL(item.url).pathname)
  assert.equal(new Set(paths).size, paths.length)
  for (const item of research) {
    assert.ok(paths.includes(`/research/${item.slug}`))
    assert.equal(new URL(item.paper.url).protocol, 'https:')
    assert.ok(item.paper.metric && item.paper.geography && item.limitation && item.modelUse)
  }
  for (const city of cityIds) for (const suffix of ['', '/about', '/simulator']) assert.ok(paths.includes(`/${city}${suffix}`))
  assert.ok(paths.every(path => !path.startsWith('/api/')))
})

test('machine-readable outputs retain limits alongside findings', async () => {
  const index = await researchIndex().json()
  assert.equal(index.approaches.length, research.length)
  for (const item of research) {
    const record = index.approaches.find((row: { slug: string }) => row.slug === item.slug)
    assert.equal(record.limitation, item.limitation)
    assert.equal(record.modelUse, item.modelUse)
  }
  const guide = await readingGuide().text()
  assert.match(guide, /Missing Mumbai water-area data is unavailable, not zero/)
  assert.match(guide, /not a forecast/)
  assert.match(guide, /not full scientific uncertainty/)
})
