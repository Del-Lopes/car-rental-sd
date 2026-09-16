/**
 * Dados institucionais do site.
 *
 * Contato e redes ficam null ate o cliente enviar (pendencia C3). Os componentes
 * so renderizam o que estiver preenchido -- nada de telefone inventado no ar.
 */
export const SITE_CONFIG = {
  name: 'Carental',
  tagline: 'Where affordable meets quality',
  description:
    'Weekly and monthly car rentals. Sedans, SUVs, wagons and more, ready to drive.',
  contact: {
    phone: null as string | null,
    email: null as string | null,
    city: null as string | null,
    instagram: null as string | null,
  },
} as const

export const PUBLIC_NAV = [
  { href: '/#fleet', label: 'Fleet' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#rental-terms', label: 'Rental terms' },
] as const
