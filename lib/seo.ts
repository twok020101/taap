import type { Metadata } from 'next'

/** Override with the public custom domain; never canonicalise to a preview deployment. */
export function getSiteUrl(env: Record<string, string | undefined> = process.env) {
  // Public custom alias verified against the existing Vercel production deployment.
  const value = env.NEXT_PUBLIC_SITE_URL || 'https://taap.thetwok.in'
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without credentials')
  return url.origin
}
export const siteUrl = getSiteUrl()
export const absoluteUrl = (path = '/') => new URL(path, `${siteUrl}/`).toString()
export function pageMetadata(title: string, description: string, path: string, image = '/opengraph-image'): Metadata {
  return { title, description, alternates: { canonical: path },
    openGraph: { type: 'website', locale: 'en_IN', siteName: 'Taap', title, description, url: path, images: [{ url: image, width: 1200, height: 630, alt: 'Taap — exploring urban heat in Indian cities' }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
export function breadcrumbs(items: { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: absoluteUrl(item.path) })) }
}
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
