import type { MetadataRoute } from 'next'

import { listPublicVehicles } from '@/lib/data/vehicles'
import { SITE_URL } from '@/lib/env'

// Regenera de hora em hora: veiculo novo entra no sitemap sem precisar de deploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await listPublicVehicles()

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'monthly', priority: 0.4 },
    ...vehicles.map((vehicle) => ({
      url: `${SITE_URL}/vehicles/${vehicle.id}`,
      lastModified: vehicle.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
