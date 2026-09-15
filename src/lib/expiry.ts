import { parseDateOnly } from '@/lib/format'
import type { DocumentUrgency } from '@/lib/types/database'

/**
 * Mesma regra da view v_expiring_vehicle_documents, em TypeScript.
 * Usada pelo modo preview (sem banco) e por qualquer tela que precise
 * classificar uma data solta. Se mudar as faixas aqui, mude na view tambem.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export function daysUntil(dateOnly: string, today: Date = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((parseDateOnly(dateOnly).getTime() - start.getTime()) / DAY_MS)
}

export function urgencyFor(daysToExpire: number): DocumentUrgency {
  if (daysToExpire < 0) return 'expired'
  if (daysToExpire <= 15) return 'critical'
  if (daysToExpire <= 30) return 'warning'
  if (daysToExpire <= 60) return 'upcoming'
  return 'ok'
}
