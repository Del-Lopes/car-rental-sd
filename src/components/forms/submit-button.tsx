'use client'

import { Loader2Icon } from 'lucide-react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost'
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending} className={cn('h-10 px-4', className)}>
      {pending && <Loader2Icon className="animate-spin" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  )
}
