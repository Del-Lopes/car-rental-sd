'use client'

import Link from 'next/link'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { PasswordInput } from '@/components/forms/password-input'
import { Input } from '@/components/ui/input'
import { signInAction } from '@/lib/actions/auth'

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const { formAction, onSubmit, values, errors } = useFormAction(signInAction)

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <Field label="Email" name="email" error={errors.email}>
        {(props) => (
          <Input {...props} type="email" autoComplete="email" defaultValue={values.email} className="h-10" required />
        )}
      </Field>

      <Field label="Password" name="password" error={errors.password}>
        {(props) => (
          <PasswordInput {...props} autoComplete="current-password" className="h-10" required />
        )}
      </Field>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
          Forgot your password?
        </Link>
      </div>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  )
}
