'use client'

import Link from 'next/link'
import { FileSignatureIcon } from 'lucide-react'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Input } from '@/components/ui/input'
import { signAgreementAction } from '@/lib/actions/agreements'

/**
 * Assinatura eletronica: marcar "li e aceito" + digitar o nome completo.
 * O nome precisa bater com o do cadastro -- a checagem definitiva e no banco;
 * a dica aqui so evita que o cliente erre sem saber o que era esperado.
 */
export function SignAgreementForm({
  agreementId,
  termsVersionId,
  termsVersion,
  expectedName,
}: {
  agreementId: string
  termsVersionId: string
  termsVersion: number
  expectedName: string
}) {
  const { formAction, onSubmit, values, errors } = useFormAction(signAgreementAction)

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="agreement_id" value={agreementId} />
      <input type="hidden" name="terms_version_id" value={termsVersionId} />

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm has-[:checked]:border-brand/50 has-[:checked]:bg-brand/5">
          <input
            type="checkbox"
            name="accepted"
            defaultChecked={values.accepted === 'on'}
            aria-invalid={Boolean(errors.accepted)}
            aria-describedby={errors.accepted ? 'accepted-error' : undefined}
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
          />
          <span>
            I have read and agree to the{' '}
            <Link href="/terms" target="_blank" className="font-medium text-brand hover:underline">
              Carental rental terms (version {termsVersion})
            </Link>{' '}
            and the rental details above.
          </span>
        </label>
        {errors.accepted && (
          <p id="accepted-error" role="alert" className="text-xs text-destructive">
            {errors.accepted[0]}
          </p>
        )}
      </div>

      <Field
        label="Type your full name to sign"
        name="signed_name"
        error={errors.signed_name}
        hint={`Must match the name on your account: ${expectedName}`}
      >
        {(p) => (
          <Input
            {...p}
            autoComplete="name"
            defaultValue={values.signed_name}
            placeholder={expectedName}
            className="h-11 text-base italic"
          />
        )}
      </Field>

      <p className="text-xs leading-relaxed text-muted-foreground">
        By signing, you agree that your typed name is your electronic signature and has the same
        effect as a handwritten one. We record the date, time, IP address and browser used. A copy is
        emailed to you.
      </p>

      <SubmitButton className="h-11 w-full sm:w-auto sm:px-6" pendingLabel="Signing…">
        <FileSignatureIcon />
        Sign agreement
      </SubmitButton>
    </form>
  )
}
