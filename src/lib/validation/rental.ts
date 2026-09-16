import { z } from 'zod'

import { dateString, optionalDecimal, optionalText, uuid } from '@/lib/validation/common'

/**
 * Locacao registrada manualmente pelo dono: quem alugou, qual plano, quanto
 * paga e quando vence a proxima parcela. Sem gateway de pagamento nesta fase.
 */
export const rentalFormSchema = z
  .object({
    vehicle_id: uuid,
    // Um dos dois identifica o locatario; o banco repete essa checagem.
    customer_id: z.preprocess((v) => (v === '' ? null : v), uuid.nullable().optional()),
    renter_name: optionalText(120),
    plan: z.enum(['weekly', 'monthly']),
    rate_amount: z.coerce.number().min(0, 'Amount cannot be negative').max(500_000),
    deposit_amount: optionalDecimal(0, 500_000),
    started_on: dateString,
    next_due_on: dateString,
    notes: optionalText(500),
  })
  .refine((data) => Boolean(data.customer_id) || Boolean(data.renter_name), {
    message: 'Select a customer or type who is renting',
    path: ['renter_name'],
  })
  .refine((data) => data.next_due_on >= data.started_on, {
    message: 'The first due date cannot be before the start date',
    path: ['next_due_on'],
  })

export type RentalFormValues = z.infer<typeof rentalFormSchema>

/** Recebimento manual: valor e data podem ser ajustados pelo dono. */
export const rentalPaymentSchema = z.object({
  rental_id: uuid,
  amount: z.coerce.number().min(0, 'Amount cannot be negative').max(500_000),
  paid_on: dateString,
})

/** Correcao de dados de uma locacao em andamento. */
export const rentalUpdateSchema = z.object({
  rental_id: uuid,
  rate_amount: z.coerce.number().min(0).max(500_000),
  next_due_on: dateString,
  notes: optionalText(500),
})
