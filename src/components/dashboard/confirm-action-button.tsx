'use client'

import { Loader2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { ActionResult } from '@/lib/actions/result'

/**
 * Botao para acoes destrutivas ou dificeis de desfazer (arquivar veiculo,
 * apagar documento). Sempre pede confirmacao e mostra o resultado em toast.
 */
export function ConfirmActionButton({
  action,
  title,
  description,
  confirmLabel,
  children,
  variant = 'destructive',
  size = 'default',
  className,
}: {
  action: () => Promise<ActionResult>
  title: string
  description: string
  confirmLabel: string
  children: React.ReactNode
  variant?: 'destructive' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon-sm'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const confirm = () =>
    startTransition(async () => {
      const result = await action()
      // Action que redireciona (ex.: excluir o registro da propria pagina) nao
      // devolve resultado: a navegacao ja esta em curso.
      if (!result) return
      if (result.ok) {
        toast.success(result.message ?? 'Done')
        setOpen(false)
      } else {
        toast.error(result.message ?? 'Something went wrong')
      }
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} className={className} />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
