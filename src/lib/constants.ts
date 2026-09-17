import type {
  DocumentStatus,
  DocumentUrgency,
  Fuel,
  InsuranceChoice,
  PaymentUrgency,
  RentalPlan,
  Transmission,
  VehicleStatus,
} from '@/lib/types/database'

/**
 * Semaforo do dashboard de vencimentos. As faixas em dias sao as mesmas da view
 * v_expiring_vehicle_documents -- se mudar aqui, mude la tambem.
 */
export const URGENCY_META: Record<
  DocumentUrgency,
  { label: string; tone: 'danger' | 'warning' | 'caution' | 'info' | 'neutral'; order: number }
> = {
  expired: { label: 'Expired', tone: 'danger', order: 0 },
  critical: { label: 'Next 15 days', tone: 'warning', order: 1 },
  warning: { label: 'Next 30 days', tone: 'caution', order: 2 },
  upcoming: { label: 'Next 60 days', tone: 'info', order: 3 },
  ok: { label: 'Up to date', tone: 'neutral', order: 4 },
}

/** Faixas exibidas no dashboard, na ordem. 'ok' fica de fora de proposito. */
export const DASHBOARD_URGENCIES: DocumentUrgency[] = [
  'expired',
  'critical',
  'warning',
  'upcoming',
]

/** Horizonte padrao do dashboard, em dias. */
export const EXPIRY_HORIZON_DAYS = 60

/**
 * Semaforo das cobrancas de locacao. As faixas sao mais curtas que as de
 * documento porque parcela semanal vence a cada 7 dias -- avisar com 60 dias
 * nao teria sentido. Precisa bater com a view v_rental_due.
 */
export const PAYMENT_URGENCY_META: Record<
  PaymentUrgency,
  { label: string; tone: 'danger' | 'warning' | 'caution' | 'info' | 'neutral'; order: number }
> = {
  overdue: { label: 'Overdue', tone: 'danger', order: 0 },
  due_today: { label: 'Due today', tone: 'warning', order: 1 },
  soon: { label: 'Next 3 days', tone: 'caution', order: 2 },
  upcoming: { label: 'Next 7 days', tone: 'info', order: 3 },
  ok: { label: 'Scheduled', tone: 'neutral', order: 4 },
}

/** Horizonte do feed de cobrancas no dashboard, em dias. */
export const PAYMENT_HORIZON_DAYS = 7

/**
 * Valor sugerido para incluir o locatario no seguro da Carental, por ciclo do
 * plano. Referencia do cliente: "a partir de US$ 20/semana", variando conforme a
 * carteira de motorista -- por isso e so sugestao, o dono ajusta por locacao.
 * Mensal: 20 x 52 semanas / 12 meses = 86,67, arredondado.
 */
export const INSURANCE_SUGGESTED_OFFER: Record<RentalPlan, number> = {
  weekly: 20,
  monthly: 87,
}

export const INSURANCE_CHOICE_META: Record<InsuranceChoice, { label: string }> = {
  own: { label: 'Own insurance' },
  carental: { label: 'Carental insurance' },
}

export const RENTAL_PLAN_META: Record<RentalPlan, { label: string; everyDaysLabel: string }> = {
  weekly: { label: 'Weekly', everyDaysLabel: 'every 7 days' },
  monthly: { label: 'Monthly', everyDaysLabel: 'every month' },
}

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; publicVisible: boolean }> =
  {
    available: { label: 'Available', publicVisible: true },
    rented: { label: 'Rented', publicVisible: true },
    maintenance: { label: 'Maintenance', publicVisible: true },
    // Reserva: igual aos demais no painel; so nao aparece na vitrine.
    reserve: { label: 'Reserve', publicVisible: false },
  }

export const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string }> = {
  pending: { label: 'Pending review' },
  approved: { label: 'Approved' },
  rejected: { label: 'Rejected' },
}

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
}

export const FUEL_LABELS: Record<Fuel, string> = {
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  electric: 'Electric',
}

/** Limites de upload -- espelham o que foi configurado nos buckets do Storage. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const ACCEPTED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export const STORAGE_BUCKETS = {
  vehiclePhotos: 'vehicle-photos',
  vehicleDocs: 'vehicle-docs',
  customerDocs: 'customer-docs',
} as const

/** Validade dos links assinados de documento privado (segundos). */
export const SIGNED_URL_TTL = 60 * 10
