'use client'

import { CheckIcon, XIcon } from 'lucide-react'
import { useFormStatus } from 'react-dom'

import { Field } from '@/components/forms/field'
import { useFormAction } from '@/components/forms/use-form-action'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { reviewCustomerDocumentAction } from '@/lib/actions/documents'
import type { CustomerDocument } from '@/lib/types/database'

/**
 * Aprovar ou recusar um documento. Os dois botoes enviam o mesmo formulario com
 * `status` diferente. Recusar exige o motivo: e o que o cliente vai ler para
 * saber o que reenviar.
 */
export function DocumentReviewForm({ document }: { document: CustomerDocument }) {
  const { formAction, onSubmit, values, errors } = useFormAction(reviewCustomerDocumentAction, {
    notes: document.notes ?? '',
  })
  const fieldName = `notes-${document.id}`

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-3" noValidate>
      <input type="hidden" name="document_id" value={document.id} />
      <Field
        label="Note to the customer"
        name={fieldName}
        error={errors.notes}
        hint="Required when rejecting. The customer sees this message."
      >
        {(p) => <Textarea {...p} name="notes" rows={2} defaultValue={values.notes} />}
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <ReviewButton status="rejected" current={document.status} />
        <ReviewButton status="approved" current={document.status} />
      </div>
    </form>
  )
}

function ReviewButton({ status, current }: { status: 'approved' | 'rejected'; current: CustomerDocument['status'] }) {
  const { pending } = useFormStatus()
  const approve = status === 'approved'

  return (
    <Button
      type="submit"
      name="status"
      value={status}
      variant={approve ? 'default' : 'destructive'}
      disabled={pending || current === status}
      className="h-9 px-3"
    >
      {approve ? <CheckIcon /> : <XIcon />}
      {approve ? (current === 'approved' ? 'Approved' : 'Approve') : current === 'rejected' ? 'Rejected' : 'Reject'}
    </Button>
  )
}
