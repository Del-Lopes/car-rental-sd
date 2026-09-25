import type { MetadataRoute } from 'next'

import { SITE_CONFIG } from '@/lib/site'

/**
 * Manifesto do PWA: e o que permite instalar o Carental como aplicativo no
 * celular ou no computador. `display: standalone` abre sem a barra do
 * navegador; as cores acompanham o tema escuro do site.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    short_name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f0f',
    theme_color: '#0f0f0f',
    lang: 'en-US',
    categories: ['travel', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Browse the fleet', url: '/#fleet' },
      { name: 'My account', url: '/dashboard' },
    ],
  }
}
