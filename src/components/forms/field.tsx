import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Rotulo + controle + erro, com os atributos de acessibilidade ligados:
 * o erro e anunciado e o controle aponta para ele via aria-describedby.
 * O controle recebe `id`, `aria-invalid` e `aria-describedby` do render prop.
 */
export function Field({
  label,
  name,
  error,
  hint,
  className,
  children,
}: {
  label: string
  name: string
  error?: string[]
  hint?: string
  className?: string
  children: (props: {
    id: string
    name: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => React.ReactNode
}) {
  const id = `field-${name}`
  const describedBy = [error?.length ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        name,
        'aria-invalid': Boolean(error?.length),
        'aria-describedby': describedBy || undefined,
      })}
      {hint && !error?.length && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error?.length ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error[0]}
        </p>
      ) : null}
    </div>
  )
}

/** Mesmo visual do Input do shadcn, para <select> nativo. */
export const nativeSelectClass =
  'h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground'
