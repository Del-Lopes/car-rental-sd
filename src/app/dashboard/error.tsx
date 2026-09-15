'use client'

import { AlertTriangleIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Falha ao carregar dados do painel (ex.: banco fora do ar). Mostra uma saida
 * clara em vez de tela em branco; o detalhe tecnico fica no log do servidor.
 */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center">
      <AlertTriangleIcon className="size-8 text-brand" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="font-semibold">We couldn&apos;t load this page</p>
        <p className="text-sm text-muted-foreground">Please try again. If it keeps happening, contact support.</p>
      </div>
      <Button onClick={reset} className="h-9 px-4">
        Try again
      </Button>
    </div>
  )
}
