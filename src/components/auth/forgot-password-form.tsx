'use client'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Input } from '@/components/ui/input'
import { requestPasswordResetAction } from '@/lib/actions/auth'

export function ForgotPasswordForm() {
  const { state, formAction, onSubmit, values, errors } = useFormAction(requestPasswordResetAction)

  if (state.ok) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {state.message}
      </p>
    )
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" name="email" error={errors.email}>
        {(props) => (
          <Input {...props} type="email" autoComplete="email" defaultValue={values.email} className="h-10" required />
        )}
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  )
}
