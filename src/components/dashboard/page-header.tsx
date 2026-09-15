import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string
  description?: string
  back?: { href: string; label: string }
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 space-y-3 sm:mb-8">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
