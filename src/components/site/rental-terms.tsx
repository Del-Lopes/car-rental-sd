import { AlertTriangleIcon, CheckIcon, InfoIcon } from 'lucide-react'

import { INCLUDED_TERMS, RESTRICTION_TERMS, type RentalTerm } from '@/lib/rental-terms'
import { cn } from '@/lib/utils'

/**
 * Condicoes de locacao do cliente. Duas apresentacoes:
 * - `full`: secao da home, com o que esta incluso e as restricoes lado a lado
 * - `compact`: bloco na pagina do veiculo, junto do preco, onde a decisao acontece.
 *   Omite caucao e quilometragem: o quadro de preco do carro ja mostra os dois,
 *   e a caucao dele pode diferir do valor padrao.
 */
export function RentalTerms({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <p className="eyebrow text-[0.6rem] text-muted-foreground">Before you rent</p>
        <TermList terms={RESTRICTION_TERMS.filter((term) => term.id !== 'deposit')} kind="restriction" compact />
        <div className="border-t border-border pt-4">
          <TermList terms={INCLUDED_TERMS.filter((term) => term.id !== 'mileage')} kind="included" compact />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-border bg-background p-6">
        <h3 className="font-semibold">Included with every rental</h3>
        <TermList terms={INCLUDED_TERMS} kind="included" />
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-background p-6">
        <h3 className="font-semibold">Requirements and restrictions</h3>
        <TermList terms={RESTRICTION_TERMS} kind="restriction" />
      </div>
    </div>
  )
}

function TermList({
  terms,
  kind,
  compact = false,
}: {
  terms: RentalTerm[]
  kind: 'included' | 'restriction'
  compact?: boolean
}) {
  return (
    <ul className={cn('space-y-3', compact && 'space-y-2.5')}>
      {terms.map((term) => {
        const Icon = kind === 'included' ? CheckIcon : term.emphasis ? AlertTriangleIcon : InfoIcon

        return (
          <li
            key={term.title}
            className={cn(
              'flex gap-3',
              // Seguro so contra terceiros e a informacao que mais gera problema
              // se passar despercebida -- ganha caixa propria.
              term.emphasis && 'rounded-lg border border-amber-500/40 bg-amber-500/10 p-3',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                kind === 'included' && 'text-emerald-500',
                kind === 'restriction' && !term.emphasis && 'text-brand',
                term.emphasis && 'text-amber-600 dark:text-amber-400',
              )}
            />
            <span className={cn('text-sm', compact && 'text-[0.8125rem]')}>
              <span className={cn('font-medium', term.emphasis && 'uppercase tracking-wide')}>{term.title}</span>
              {term.detail && <span className="block text-muted-foreground">{term.detail}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
