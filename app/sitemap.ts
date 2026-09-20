import type { MetadataRoute } from 'next'
import { cityIds } from '@/cities'
import { research, RESEARCH_REVIEWED } from '@/lib/research'
import { absoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/') },
    { url: absoluteUrl('/research'), lastModified: RESEARCH_REVIEWED },
    ...research.map(item => ({ url: absoluteUrl(`/research/${item.slug}`), lastModified: RESEARCH_REVIEWED })),
    ...cityIds.flatMap(city => ['', '/simulator', '/about'].map(suffix => ({ url: absoluteUrl(`/${city}${suffix}`) }))),
  ]
}
