'use client'

import { useActionState, useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { idleResult, type ActionResult } from '@/lib/actions/result'

type Action = (state: ActionResult, formData: FormData) => Promise<ActionResult>

/**
 * `useActionState` com as duas coisas que todo formulario do painel precisa:
 *
 * 1. Valores "grudentos": o React 19 reseta o formulario depois de cada action,
 *    inclusive quando a validacao falha -- o usuario perderia tudo o que
 *    digitou. Guardamos os valores no submit e devolvemos como defaultValue.
 * 2. Toast com a mensagem da action (sucesso ou erro geral). Erros de campo
 *    ficam no proprio campo, nao no toast.
 */
export function useFormAction(action: Action, initialValues: Record<string, string> = {}) {
  const [state, formAction, pending] = useActionState(action, idleResult)
  const [values, setValues] = useState(initialValues)
  const lastState = useRef(state)

  useEffect(() => {
    if (state === lastState.current) return
    lastState.current = state
    if (!state.message) return
    if (state.ok) toast.success(state.message)
    else toast.error(state.message)
  }, [state])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const next: Record<string, string> = {}
    for (const [key, value] of new FormData(event.currentTarget)) {
      // Senha e arquivo nunca voltam para o formulario.
      if (typeof value === 'string' && !key.includes('password')) next[key] = value
    }
    setValues(next)
  }

  return {
    state,
    formAction,
    pending,
    values,
    onSubmit,
    errors: state.fieldErrors ?? {},
  }
}
