import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Area logada e endpoints tecnicos nao tem nada para indexar.
      disallow: ['/dashboard', '/api', '/auth', '/offline'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
