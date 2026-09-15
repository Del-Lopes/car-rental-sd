import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * Wordmark do Carental recriado em HTML/CSS a partir do logo (placa dourada com
 * letras pretas). O JPEG original tem um fundo grande em volta e ficaria
 * ilegivel no tamanho de um header; assim a marca escala nitida em qualquer
 * tela. O arquivo original continua sendo usado como imagem de Open Graph.
 */
export function BrandMark({
  size = 'md',
  withTagline = false,
  href = '/',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  href?: string | null
  className?: string
}) {
  const plate = (
    <span className={cn('inline-flex flex-col items-center gap-2', className)}>
      <span
        className={cn(
          'gold-plate inline-flex items-center justify-center rounded-md font-display text-neutral-950 shadow-sm',
          size === 'sm' && 'h-7 px-2.5 text-[0.7rem] tracking-[0.18em]',
          size === 'md' && 'h-9 px-3.5 text-sm tracking-[0.2em]',
          size === 'lg' && 'h-16 px-7 text-2xl tracking-[0.22em] sm:h-20 sm:px-9 sm:text-3xl',
        )}
      >
        CARENTAL
      </span>
      {withTagline && (
        <span className="eyebrow text-brand">Where affordable meets quality</span>
      )}
    </span>
  )

  if (!href) return plate

  return (
    <Link href={href} aria-label="Carental home" className="inline-flex rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {plate}
    </Link>
  )
}
