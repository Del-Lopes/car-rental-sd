import 'server-only'

import { PAYMENT_HORIZON_DAYS } from '@/lib/constants'
import { isPreviewMode } from '@/lib/preview'
import { fixtureRentalDue, fixtureRentalPayments } from '@/lib/preview-fixtures'
import { createClient } from '@/lib/supabase/server'
import type { Rental, RentalDue, RentalPayment } from '@/lib/types/database'

/**
 * Locacoes ativas e suas cobrancas. Tudo lancado a mao pelo dono -- nao ha
 * integracao com gateway de pagamento nesta fase.
 */

/** Feed do dashboard: cobrancas atrasadas e a vencer, da mais urgente. */
export async function listDueRentals(horizonDays: number = PAYMENT_HORIZON_DAYS): Promise<RentalDue[]> {
  if (isPreviewMode()) {
    return fixtureRentalDue().filter((rental) => rental.days_to_due <= horizonDays)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_rental_due')
    .select('*')
    .lte('days_to_due', horizonDays)
    .order('days_to_due', { ascending: true })

  if (error) throw new Error(`Failed to load rental payments: ${error.message}`)
  return data ?? []
}

/** Todas as locacoes ativas, inclusive as com vencimento distante. */
export async function listActiveRentals(): Promise<RentalDue[]> {
  if (isPreviewMode()) return fixtureRentalDue()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_rental_due')
    .select('*')
    .order('days_to_due', { ascending: true })

  if (error) throw new Error(`Failed to load rentals: ${error.message}`)
  return data ?? []
}

/**
 * Locacao ativa de um veiculo, lida da view: ela ja resolve o nome do
 * locatario, venha ele do cliente cadastrado ou do campo livre.
 */
export async function getActiveRentalForVehicle(vehicleId: string): Promise<RentalDue | null> {
  if (isPreviewMode()) {
    return fixtureRentalDue().find((r) => r.vehicle_id === vehicleId) ?? null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_rental_due')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .maybeSingle()

  if (error?.code === '22P02') return null
  if (error) throw new Error(`Failed to load rental: ${error.message}`)
  return data ?? null
}

export async function listRentalPayments(rentalId: string): Promise<RentalPayment[]> {
  if (isPreviewMode()) {
    return fixtureRentalPayments.filter((payment) => payment.rental_id === rentalId)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rental_payments')
    .select('*')
    .eq('rental_id', rentalId)
    .order('paid_on', { ascending: false })

  if (error) throw new Error(`Failed to load payments: ${error.message}`)
  return data ?? []
}

/** Historico de locacoes encerradas de um veiculo. */
export async function listClosedRentals(vehicleId: string): Promise<Rental[]> {
  if (isPreviewMode()) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'closed')
    .order('ended_on', { ascending: false })

  if (error) throw new Error(`Failed to load rental history: ${error.message}`)
  return data ?? []
}
