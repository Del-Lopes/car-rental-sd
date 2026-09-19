'use client'

import { MailCheckIcon } from 'lucide-react'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { PasswordInput } from '@/components/forms/password-input'
import { Input } from '@/components/ui/input'
import { signUpAction } from '@/lib/actions/auth'

export function RegisterForm() {
  const { state, formAction, onSubmit, values, errors } = useFormAction(signUpAction)

  // Confirmacao de e-mail ligada: a conta existe, mas a etapa de documentos so
  // abre depois do clique no link.
  if (state.ok) {
    return (
      <div className="space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
        <MailCheckIcon className="mx-auto size-8 text-brand" strokeWidth={1.5} />
        <p className="font-semibold">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <strong className="text-foreground">{values.email}</strong>.
          Open it to continue and upload your documents.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Full name" name="full_name" error={errors.full_name}>
        {(props) => <Input {...props} autoComplete="name" defaultValue={values.full_name} className="h-10" required />}
      </Field>

      <Field label="Email" name="email" error={errors.email}>
        {(props) => (
          <Input {...props} type="email" autoComplete="email" defaultValue={values.email} className="h-10" required />
        )}
      </Field>

      <Field label="Phone" name="phone" error={errors.phone} hint="Optional — so our team can reach you.">
        {(props) => <Input {...props} type="tel" autoComplete="tel" defaultValue={values.phone} className="h-10" />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" name="password" error={errors.password}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" className="h-10" required />}
        </Field>
        <Field label="Confirm" name="confirm_password" error={errors.confirm_password}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" className="h-10" required />}
        </Field>
      </div>

      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Continue to documents
      </SubmitButton>
    </form>
  )
}
