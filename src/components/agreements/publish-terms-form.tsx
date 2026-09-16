'use client'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Textarea } from '@/components/ui/textarea'
import { publishTermsAction } from '@/lib/actions/agreements'

export function PublishTermsForm({ currentBody }: { currentBody: string }) {
  const { formAction, onSubmit, values, errors } = useFormAction(publishTermsAction, { body: currentBody })

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        label="Terms text"
        name="body"
        error={errors.body}
        hint="Plain text. Leave a blank line between paragraphs."
      >
        {(p) => <Textarea {...p} rows={22} defaultValue={values.body} className="font-mono text-[0.8125rem] leading-relaxed" />}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-xs text-muted-foreground">
          Publishing creates a new version. Agreements already signed keep the version they
          agreed to; agreements still pending will be signed against this new version.
        </p>
        <SubmitButton pendingLabel="Publishing…">Publish new version</SubmitButton>
      </div>
    </form>
  )
}
