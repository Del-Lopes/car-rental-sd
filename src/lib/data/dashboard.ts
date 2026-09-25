import 'server-only'

import { cache } from 'react'

import { DASHBOARD_URGENCIES, EXPIRY_HORIZON_DAYS, URGENCY_META } from '@/lib/constants'
import { isPreviewMode } from '@/lib/preview'
import { fixtureDashboardStats, fixtureExpiringDocuments } from '@/lib/preview-fixtures'
import { createClient } from '@/lib/supabase/server'
import type { AdminDashboardStats, DocumentUrgency, ExpiringVehicleDocument } from '@/lib/types/database'

const EMPTY_STATS: AdminDashboardStats = {
  vehicles_total: 0,
  vehicles_available: 0,
  vehicles_rented: 0,
  vehicles_maintenance: 0,
  customers_total: 0,
  customer_docs_pending: 0,
  vehicle_docs_expired: 0,
  vehicle_docs_expiring: 0,
  rentals_active: 0,
  payments_overdue: 0,
  payments_due_soon: 0,
  agreements_pending: 0,
  vehicles_reserve: 0,
}

/**
 * Cards do topo do dashboard: uma linha, uma ida ao banco.
 * `cache` porque o layout e a pagina pedem os mesmos numeros no mesmo request.
 */
export const getDashboardStats = cache(async (): Promise<AdminDashboardStats> => {
  if (isPreviewMode()) return fixtureDashboardStats()

  const supabase = await createClient()

  const { data, error } = await supabase.from('v_admin_dashboard_stats').select('*').maybeSingle()

  if (error) throw new Error(`Failed to load dashboard stats: ${error.message}`)
  return data ?? EMPTY_STATS
})

/**
 * Documentos de veiculo que vencem dentro do horizonte, do mais urgente para o
 * menos. Vencidos vem primeiro porque sao os que custam multa.
 */
export async function getExpiringVehicleDocuments(
  horizonDays: number = EXPIRY_HORIZON_DAYS,
): Promise<ExpiringVehicleDocument[]> {
  if (isPreviewMode()) {
    return fixtureExpiringDocuments().filter((doc) => doc.days_to_expire <= horizonDays)
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('v_expiring_vehicle_documents')
    .select('*')
    .lte('days_to_expire', horizonDays)
    .order('days_to_expire', { ascending: true })

  if (error) throw new Error(`Failed to load expiring documents: ${error.message}`)
  return data ?? []
}

export type UrgencyGroup = {
  urgency: DocumentUrgency
  label: string
  tone: (typeof URGENCY_META)[DocumentUrgency]['tone']
  documents: ExpiringVehicleDocument[]
}

/** Agrupa para a tabela do dashboard, mantendo a ordem do semaforo. */
export function groupByUrgency(documents: ExpiringVehicleDocument[]): UrgencyGroup[] {
  return DASHBOARD_URGENCIES.map((urgency) => ({
    urgency,
    label: URGENCY_META[urgency].label,
    tone: URGENCY_META[urgency].tone,
    documents: documents.filter((document) => document.urgency === urgency),
  })).filter((group) => group.documents.length > 0)
}
