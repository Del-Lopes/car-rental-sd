'use client'

import { RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Falha ao carregar a vitrine (ex.: banco indisponivel). O visitante ve uma
 * pagina da marca com opcao de tentar de novo, e nao o "Application error"
 * cru do Next. O detalhe tecnico fica no log do servidor (Vercel).
 */
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-24 text-center">
      <p className="eyebrow text-brand">Temporarily unavailable</p>
      <h1 className="text-3xl font-semibold tracking-tight">We&apos;re tuning things up</h1>
      <p className="text-muted-foreground">
        The fleet couldn&apos;t be loaded right now. Please try again in a moment.
      </p>
      <Button onClick={reset} className="h-10 px-5">
        <RefreshCwIcon />
        Try again
      </Button>
    </div>
  )
}
