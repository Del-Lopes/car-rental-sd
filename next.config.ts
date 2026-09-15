import type { NextConfig } from 'next'

/**
 * As fotos dos veiculos ficam no Storage publico do Supabase. O next/image so
 * otimiza imagens de hosts liberados aqui, entao o host e derivado da mesma
 * variavel que o app usa -- trocar de projeto nao exige mexer neste arquivo.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  experimental: {
    serverActions: {
      // Uploads de documento e foto chegam a 10 MB (limite dos buckets).
      bodySizeLimit: '11mb',
    },
  },
}

export default nextConfig
