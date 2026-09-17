import { z } from 'zod'

import { lastDayOfMonth } from '@/lib/format'
import {
  checkbox,
  optionalDecimal,
  optionalInt,
  optionalText,
  requiredText,
  uuid,
} from '@/lib/validation/common'

const CURRENT_YEAR = new Date().getFullYear()
const MAX_MODEL_YEAR = CURRENT_YEAR + 2

export const vehicleFormSchema = z.object({
  make: requiredText('Make', 60),
  model: requiredText('Model', 60),
  year: z.coerce
    .number()
    .int()
    .min(1950, 'Year must be 1950 or later')
    .max(MAX_MODEL_YEAR, `Year must be ${MAX_MODEL_YEAR} or earlier`),
  category_slug: requiredText('Category', 40),
  transmission: z.enum(['automatic', 'manual']),
  fuel: z.preprocess(
    (value) => (value === '' ? null : value),
    z.enum(['gasoline', 'diesel', 'hybrid', 'electric']).nullable().optional(),
  ),
  seats: optionalInt(1, 20),
  doors: optionalInt(1, 8),
  color: optionalText(40),
  mileage: optionalInt(0, 2_000_000),
  plate: optionalText(20),
  vin: optionalText(30),
  // Sem diaria: a locadora so aluga por semana ou por mes.
  weekly_rate: z.coerce
    .number()
    .min(0, 'Weekly rate cannot be negative')
    .max(100_000, 'Weekly rate looks too high'),
  monthly_rate: z.coerce
    .number()
    .min(0, 'Monthly rate cannot be negative')
    .max(500_000, 'Monthly rate looks too high'),
  security_deposit: optionalDecimal(0, 100_000),
  status: z.enum(['available', 'rented', 'maintenance', 'reserve']).default('available'),
  description: optionalText(2000),
  featured: checkbox,
})

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>

/**
 * Documento do veiculo (hoje so a registration).
 *
 * O formulario pede mes e ano; o schema converte para o ultimo dia do mes antes
 * de gravar, para que `days_to_expire` no dashboard conte certo. Quem consome
 * este schema ja recebe o objeto no formato da tabela.
 */
export const vehicleDocumentFormSchema = z
  .object({
    vehicle_id: uuid,
    type_slug: requiredText('Document type', 40),
    doc_number: optionalText(60),
    expires_month: z.coerce
      .number()
      .int()
      .min(1, 'Select a month')
      .max(12, 'Select a month'),
    expires_year: z.coerce
      .number()
      .int()
      .min(CURRENT_YEAR - 5, 'Year looks too far in the past')
      .max(CURRENT_YEAR + 30, 'Year looks too far in the future'),
    notes: optionalText(500),
  })
  .transform(({ expires_month, expires_year, ...rest }) => ({
    ...rest,
    expires_at: lastDayOfMonth(expires_year, expires_month),
  }))

export type VehicleDocumentFormValues = z.infer<typeof vehicleDocumentFormSchema>

/** Filtros do feed publico. Tudo opcional: a home entra sem nenhum filtro. */
export const vehicleFilterSchema = z.object({
  category: z.string().trim().max(40).optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest']).default('newest'),
})

export type VehicleFilters = z.infer<typeof vehicleFilterSchema>
