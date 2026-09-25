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
    // O caminho de cada foto ja carrega data e uuid, entao nunca muda de
    // conteudo: cache longo evita reprocessar a mesma imagem toda hora.
    minimumCacheTTL: 2_592_000,
  },
  experimental: {
    serverActions: {
      // Uploads de documento e foto chegam a 10 MB (limite dos buckets).
      bodySizeLimit: '11mb',
    },
  },
  /**
   * Cabecalhos de seguranca.
   *
   * O token de sessao do Supabase fica em cookie legivel por JavaScript (assim
   * funciona a biblioteca no navegador), entao a CSP e a real defesa contra um
   * script injetado roubar a sessao. `frame-ancestors none` impede que o site
   * seja embutido em outra pagina para enganar quem assina o contrato.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' segue necessario: o Next injeta scripts e estilos inline.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ''}`,
      "font-src 'self' data:",
      `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ''}`,
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default nextConfig
