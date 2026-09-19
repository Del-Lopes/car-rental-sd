'use client'

import { UploadIcon } from 'lucide-react'

import { Field } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { FileInput } from '@/components/forms/file-input'
import { Input } from '@/components/ui/input'
import { uploadCustomerDocumentAction } from '@/lib/actions/documents'
import { ACCEPTED_DOCUMENT_TYPES } from '@/lib/constants'
import type { CustomerDocumentType } from '@/lib/types/database'

export function DocumentUploadForm({
  type,
  isReplacement,
}: {
  type: CustomerDocumentType
  isReplacement: boolean
}) {
  const { formAction, onSubmit, values, errors } = useFormAction(uploadCustomerDocumentAction)

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-3" noValidate>
      <input type="hidden" name="type_slug" value={type.slug} />

      <div className={type.requires_expiry ? 'grid gap-3 sm:grid-cols-[1fr_180px]' : undefined}>
        <Field label={isReplacement ? 'Upload a new file' : 'File'} name={`file-${type.slug}`} error={errors.file}>
          {(p) => (
            <FileInput
              {...p}
              name="file"
              accept={ACCEPTED_DOCUMENT_TYPES.join(',')}
              className="h-10 py-1.5"
              required
            />
          )}
        </Field>

        {type.requires_expiry && (
          <Field label="Expiration date" name={`expires-${type.slug}`} error={errors.expires_at}>
            {(p) => <Input {...p} name="expires_at" type="date" defaultValue={values.expires_at} className="h-10" />}
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">PDF, JPG, PNG or WebP · up to 4 MB (photos are resized automatically) · make sure it&apos;s readable</p>
        <SubmitButton pendingLabel="Uploading…" className="h-9">
          <UploadIcon />
          {isReplacement ? 'Send new file' : 'Upload'}
        </SubmitButton>
      </div>
    </form>
  )
}
