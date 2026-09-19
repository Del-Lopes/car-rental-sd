'use client'

import { FileTextIcon } from 'lucide-react'

import { Field, nativeSelectClass } from '@/components/forms/field'
import { FileInput } from '@/components/forms/file-input'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { saveVehicleDocumentAction } from '@/lib/actions/vehicles'
import { ACCEPTED_DOCUMENT_TYPES } from '@/lib/constants'
import type { VehicleDocument } from '@/lib/types/database'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Registration do veiculo, com vencimento em mes/ano (decisao do cliente).
 *
 * A renovacao ATUALIZA o registro existente em vez de criar outro: o dashboard
 * lista todo documento com data, entao manter a registration antiga faria o
 * carro aparecer como "vencido" para sempre, mesmo ja renovado.
 */
export function RegistrationCard({
  vehicleId,
  registration,
  status,
}: {
  vehicleId: string
  registration: VehicleDocument | null
  status: React.ReactNode
}) {
  const [year, month] = registration?.expires_at?.split('-') ?? []
  const { formAction, onSubmit, values, errors } = useFormAction(saveVehicleDocumentAction, {
    expires_month: month ? String(Number(month)) : '',
    expires_year: year ?? '',
    doc_number: registration?.doc_number ?? '',
    notes: registration?.notes ?? '',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Registration {status}
        </CardTitle>
        <CardDescription>Expiration is tracked by month and year and shows up on the overview.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
          <input type="hidden" name="vehicle_id" value={vehicleId} />
          <input type="hidden" name="type_slug" value="registration" />
          {registration && <input type="hidden" name="document_id" value={registration.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expires — month" name="expires_month" error={errors.expires_month}>
              {(p) => (
                <select {...p} defaultValue={values.expires_month} className={nativeSelectClass}>
                  <option value="" disabled>
                    Month
                  </option>
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {String(index + 1).padStart(2, '0')} — {label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Expires — year" name="expires_year" error={errors.expires_year}>
              {(p) => (
                <Input {...p} type="number" inputMode="numeric" placeholder="2027" defaultValue={values.expires_year} className="h-9" />
              )}
            </Field>
          </div>

          <Field label="Registration number" name="doc_number" error={errors.doc_number}>
            {(p) => <Input {...p} defaultValue={values.doc_number} className="h-9" />}
          </Field>

          <Field
            label={registration?.file_path ? 'Replace file' : 'File'}
            name="file"
            error={errors.file}
            hint="Optional. PDF up to 4 MB, or a photo (resized automatically)."
          >
            {(p) => <FileInput {...p} accept={ACCEPTED_DOCUMENT_TYPES.join(',')} className="h-9 py-1" />}
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {registration?.file_path ? (
              <a
                href={`/dashboard/files/vehicle/${registration.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
              >
                <FileTextIcon className="size-4" />
                View current file
              </a>
            ) : (
              <span />
            )}
            <SubmitButton pendingLabel="Saving…" variant="secondary">
              {registration ? 'Update registration' : 'Save registration'}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
