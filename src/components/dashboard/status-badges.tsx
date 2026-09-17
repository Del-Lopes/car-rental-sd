import {
  DOCUMENT_STATUS_META,
  PAYMENT_URGENCY_META,
  URGENCY_META,
  VEHICLE_STATUS_META,
} from '@/lib/constants'
import type {
  DocumentStatus,
  DocumentUrgency,
  PaymentUrgency,
  VehicleStatus,
} from '@/lib/types/database'
import { cn } from '@/lib/utils'

/**
 * Selos de status do painel. Cor nunca e o unico sinal: todo selo carrega o
 * texto do estado, para funcionar tambem para quem nao distingue as cores.
 */

type Tone = 'danger' | 'warning' | 'caution' | 'info' | 'success' | 'neutral' | 'brand'

const TONE_CLASS: Record<Tone, string> = {
  danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  warning: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  caution: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  neutral: 'border-border bg-muted text-muted-foreground',
  brand: 'border-brand/30 bg-brand/10 text-brand',
}

export function ToneBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[0.7rem] font-medium',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const VEHICLE_TONE: Record<VehicleStatus, Tone> = {
  available: 'success',
  rented: 'brand',
  maintenance: 'caution',
  reserve: 'info',
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <ToneBadge tone={VEHICLE_TONE[status]}>{VEHICLE_STATUS_META[status].label}</ToneBadge>
}

export function UrgencyBadge({ urgency, label }: { urgency: DocumentUrgency; label?: string }) {
  const meta = URGENCY_META[urgency]
  const tone: Tone = meta.tone === 'neutral' ? 'success' : meta.tone
  return <ToneBadge tone={tone}>{label ?? meta.label}</ToneBadge>
}

export function PaymentUrgencyBadge({ urgency, label }: { urgency: PaymentUrgency; label?: string }) {
  const meta = PAYMENT_URGENCY_META[urgency]
  const tone: Tone = meta.tone === 'neutral' ? 'neutral' : meta.tone
  return <ToneBadge tone={tone}>{label ?? meta.label}</ToneBadge>
}

const DOCUMENT_TONE: Record<DocumentStatus, Tone> = {
  pending: 'caution',
  approved: 'success',
  rejected: 'danger',
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <ToneBadge tone={DOCUMENT_TONE[status]}>{DOCUMENT_STATUS_META[status].label}</ToneBadge>
}
