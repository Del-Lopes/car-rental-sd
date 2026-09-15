import type { ZodError } from 'zod'

/**
 * Formato unico de retorno das server actions, pensado para `useActionState`.
 * Arquivo separado dos actions porque um modulo 'use server' so pode exportar
 * funcoes assincronas -- tipos e helpers sincronos nao cabem la.
 */
export type ActionResult = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
}

export const idleResult: ActionResult = { ok: false }

export function success(message?: string): ActionResult {
  return { ok: true, message }
}

export function failure(message: string, fieldErrors?: Record<string, string[]>): ActionResult {
  return { ok: false, message, fieldErrors }
}

/**
 * Converte erros do Zod no mapa campo -> mensagens.
 * Lido de `issues` (e nao de `flatten()`) porque essa e a parte da API que se
 * manteve estavel entre as versoes do Zod.
 */
export function fieldErrorsFrom(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_form'
    errors[key] = [...(errors[key] ?? []), issue.message]
  }

  return errors
}

export function validationFailure(error: ZodError): ActionResult {
  return failure('Check the highlighted fields', fieldErrorsFrom(error))
}
