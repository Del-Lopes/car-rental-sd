'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FileSignatureIcon } from 'lucide-react'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Input } from '@/components/ui/input'
import { signAgreementAction } from '@/lib/actions/agreements'
import { formatCurrency } from '@/lib/format'

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
  rentAmount,
  insuranceOffer,
  cycleLabel,
}: {
  agreementId: string
  termsVersionId: string
  termsVersion: number
  expectedName: string
  rentAmount: number
  /** Valor para incluir o locatario no seguro da Carental; null = nao oferecido. */
  insuranceOffer: number | null
  /** "week" ou "month". */
  cycleLabel: string
}) {
  const { state, formAction, onSubmit, values, errors } = useFormAction(signAgreementAction)
  const router = useRouter()

  // Se o admin publicou novos termos (ou mexeu no seguro) enquanto esta tela
  // estava aberta, o banco recusa a assinatura. Sem recarregar, toda nova
  // tentativa falharia igual: a pagina se atualiza sozinha com o texto novo.
  useEffect(() => {
    if (!state.ok && state.message && /updated|not available/i.test(state.message)) {
      router.refresh()
    }
  }, [state, router])

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="agreement_id" value={agreementId} />
      <input type="hidden" name="terms_version_id" value={termsVersionId} />

      {/* Todo locatario precisa de seguro: o proprio, ou incluido no da Carental. */}
      <fieldset className="space-y-2" aria-describedby={errors.insurance_choice ? 'insurance-error' : undefined}>
        <legend className="mb-2 text-sm font-medium">Insurance</legend>
        <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm has-[:checked]:border-brand/50 has-[:checked]:bg-brand/5">
          <input
            type="radio"
            name="insurance_choice"
            value="own"
            defaultChecked={values.insurance_choice === 'own'}
            className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
          />
          <span>
            <span className="font-medium">I&apos;ll use my own insurance</span>
            <span className="block text-muted-foreground">
              Total per {cycleLabel}: {formatCurrency(rentAmount)}
            </span>
          </span>
        </label>
        {insuranceOffer !== null && (
          <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm has-[:checked]:border-brand/50 has-[:checked]:bg-brand/5">
            <input
              type="radio"
              name="insurance_choice"
              value="carental"
              defaultChecked={values.insurance_choice === 'carental'}
              className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
            />
            <span>
              <span className="font-medium">
                Add me to Carental&apos;s insurance · {formatCurrency(insuranceOffer)}/{cycleLabel}
              </span>
              <span className="block text-muted-foreground">
                Price set for your driver profile. Total per {cycleLabel}:{' '}
                {formatCurrency(rentAmount + insuranceOffer)}
              </span>
            </span>
          </label>
        )}
        {errors.insurance_choice && (
          <p id="insurance-error" role="alert" className="text-xs text-destructive">
            {errors.insurance_choice[0]}
          </p>
        )}
      </fieldset>

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
