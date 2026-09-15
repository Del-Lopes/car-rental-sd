'use client'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { updatePasswordAction, updateProfileAction } from '@/lib/actions/auth'

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const { formAction, onSubmit, values, errors } = useFormAction(updateProfileAction, {
    full_name: fullName,
    phone,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How our team identifies and contacts you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" name="full_name" error={errors.full_name}>
            {(p) => <Input {...p} autoComplete="name" defaultValue={values.full_name} className="h-10" />}
          </Field>
          <Field label="Email" name="email" hint="Contact us to change the email on your account.">
            {(p) => <Input {...p} type="email" value={email} readOnly disabled className="h-10" />}
          </Field>
          <Field label="Phone" name="phone" error={errors.phone}>
            {(p) => <Input {...p} type="tel" autoComplete="tel" defaultValue={values.phone} className="h-10" />}
          </Field>
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function PasswordForm() {
  const { formAction, onSubmit, errors } = useFormAction(updatePasswordAction)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>At least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="New password" name="password" error={errors.password}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" className="h-10" />}
          </Field>
          <Field label="Confirm new password" name="confirm_password" error={errors.confirm_password}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" className="h-10" />}
          </Field>
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Updating…" variant="secondary">
              Update password
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
