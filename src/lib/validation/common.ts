import { z } from 'zod'

/**
 * Helpers de validacao compartilhados.
 *
 * Todo formulario do painel chega como FormData, onde campo vazio vira string
 * vazia e numero vira string. Estes helpers normalizam isso para o formato que
 * o Postgres espera (null / number / boolean) antes de validar.
 */

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value

export const optionalText = (max = 255) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional())

export const requiredText = (label: string, max = 255) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)

export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (value) => (blankToNull(value) === null ? null : Number(value)),
    z.number().int().min(min).max(max).nullable().optional(),
  )

export const optionalDecimal = (min: number, max: number) =>
  z.preprocess(
    (value) => (blankToNull(value) === null ? null : Number(value)),
    z.number().min(min).max(max).nullable().optional(),
  )

/**
 * Valor obrigatorio. `z.coerce.number()` transformaria o campo vazio em 0 -- um
 * carro sem preco digitado sairia na vitrine por $0.
 */
export const requiredDecimal = (label: string, min: number, max: number) =>
  z.preprocess(
    (value) => (blankToNull(value) === null ? undefined : Number(value)),
    z
      .number({ error: `${label} is required` })
      .min(min, `${label} cannot be negative`)
      .max(max, `${label} looks too high`),
  )

/** Colunas `date` do Postgres: sempre YYYY-MM-DD. */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')

export const optionalDate = z.preprocess(blankToNull, dateString.nullable().optional())

/** Checkbox de HTML nao envia nada quando desmarcado, e "on" quando marcado. */
export const checkbox = z.preprocess(
  (value) => value === true || value === 'on' || value === 'true',
  z.boolean(),
)

export const uuid = z.uuid('Invalid identifier')
