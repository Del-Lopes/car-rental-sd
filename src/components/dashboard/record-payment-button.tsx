'use client'

import { BanknoteIcon, Loader2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Field } from '@/components/forms/field'
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
import { Input } from '@/components/ui/input'
import { idleResult } from '@/lib/actions/result'
import { registerRentalPaymentAction } from '@/lib/actions/rentals'
import { RENTAL_PLAN_META } from '@/lib/constants'
import { formatCurrency, formatDate, todayIso } from '@/lib/format'
import type { RentalPlan } from '@/lib/types/database'

/**
 * Registra o recebimento de uma parcela. Valor e data vem preenchidos com o
 * caso comum (valor do plano, hoje), mas continuam editaveis -- recebimento
 * parcial ou atrasado e rotina numa locadora.
 */
export function RecordPaymentButton({
  rentalId,
  amount,
  insuranceAmount = 0,
  plan,
  dueOn,
  size = 'sm',
}: {
  rentalId: string
  /** Total esperado no ciclo: aluguel + seguro. */
  amount: number
  insuranceAmount?: number
  plan: RentalPlan
  dueOn: string
  size?: 'sm' | 'default'
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const today = todayIso()

  const submit = (formData: FormData) =>
    startTransition(async () => {
      formData.set('rental_id', rentalId)
      const result = await registerRentalPaymentAction(idleResult, formData)
      if (result.ok) {
        toast.success(result.message ?? 'Payment recorded')
        setOpen(false)
      } else {
        toast.error(result.message ?? 'Something went wrong')
      }
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} />}>
        <BanknoteIcon />
        Add payment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Due {formatDate(dueOn)} · {RENTAL_PLAN_META[plan].label} plan. Saving moves the next due
            date {RENTAL_PLAN_META[plan].everyDaysLabel}.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount received" name="amount">
              {(p) => (
                <Input {...p} type="number" step="0.01" min="0" defaultValue={amount} className="h-10" required />
              )}
            </Field>
            <Field label="Payment date" name="paid_on">
              {(p) => <Input {...p} type="date" defaultValue={today} className="h-10" required />}
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected for this cycle: {formatCurrency(amount)}
            {Number(insuranceAmount) > 0 && (
              <>
                {' '}
                (rent {formatCurrency(amount - Number(insuranceAmount))} + insurance {formatCurrency(insuranceAmount)})
              </>
            )}
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              Save payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
