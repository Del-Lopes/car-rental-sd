'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth'
import { todayIso } from '@/lib/format'
import { PREVIEW_WRITE_MESSAGE, isPreviewMode } from '@/lib/preview'
import { createClient } from '@/lib/supabase/server'
import { rentalFormSchema, rentalPaymentSchema, rentalUpdateSchema } from '@/lib/validation/rental'
import { failure, success, validationFailure, type ActionResult } from '@/lib/actions/result'

/**
 * Locacoes lancadas a mao pelo dono. O status do veiculo (alugado / disponivel)
 * e o avanco do vencimento ficam a cargo do banco -- trigger e funcao -- para
 * nao existir estado pela metade se uma das etapas falhar.
 */

function revalidateRentals(vehicleId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/vehicles')
  revalidatePath('/')
  if (vehicleId) {
    revalidatePath(`/dashboard/vehicles/${vehicleId}`)
    revalidatePath(`/vehicles/${vehicleId}`)
  }
}

export async function startRentalAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = rentalFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('rentals').insert({
    ...parsed.data,
    // Quando ha cliente cadastrado, o nome vem dele; o campo livre so serve
    // para quem nao tem conta.
    renter_name: parsed.data.customer_id ? null : parsed.data.renter_name,
  })

  if (error) return failure(translateRentalError(error.message))

  revalidateRentals(parsed.data.vehicle_id)
  return success('Rental started')
}

/**
 * Registra o recebimento e empurra o proximo vencimento numa unica chamada:
 * a funcao no banco faz as duas coisas na mesma transacao.
 */
export async function registerRentalPaymentAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = rentalPaymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('register_rental_payment', {
    p_rental_id: parsed.data.rental_id,
    p_amount: parsed.data.amount,
    p_paid_on: parsed.data.paid_on,
  })

  if (error) return failure(error.message)

  revalidateRentals(data?.vehicle_id)
  return success('Payment recorded')
}

export async function updateRentalAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = rentalUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rentals')
    .update({
      rate_amount: parsed.data.rate_amount,
      insurance_offer_amount: parsed.data.insurance_offer_amount ?? null,
      insurance_amount: parsed.data.insurance_amount,
      next_due_on: parsed.data.next_due_on,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', parsed.data.rental_id)
    .select('vehicle_id')
    .maybeSingle()

  if (error) return failure(error.message)
  if (!data) return failure('Rental not found')

  revalidateRentals(data.vehicle_id)
  return success('Rental updated')
}

/** Encerra a locacao; o trigger devolve o veiculo para a vitrine. */
export async function closeRentalAction(rentalId: string): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rentals')
    .update({ status: 'closed', ended_on: todayIso() })
    .eq('id', rentalId)
    .select('vehicle_id')
    .maybeSingle()

  if (error) return failure(error.message)
  if (!data) return failure('Rental not found')

  revalidateRentals(data.vehicle_id)
  return success('Rental closed. The vehicle is available again.')
}

function translateRentalError(message: string): string {
  if (message.includes('rentals_one_active_per_vehicle')) {
    return 'This vehicle already has an active rental'
  }
  if (message.includes('rentals_renter_check')) {
    return 'Select a customer or type who is renting'
  }
  if (message.includes('violates row-level security')) {
    return 'You do not have permission to perform this action'
  }
  return message
}
