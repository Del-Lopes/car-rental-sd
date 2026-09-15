import { z } from 'zod'

import { ACCEPTED_DOCUMENT_TYPES, MAX_UPLOAD_BYTES } from '@/lib/constants'
import { optionalDate, optionalText, requiredText, uuid } from '@/lib/validation/common'

/** Upload feito pelo locatario na area dele. */
export const customerDocumentUploadSchema = z.object({
  type_slug: requiredText('Document type', 40),
  expires_at: optionalDate,
})

export type CustomerDocumentUploadValues = z.infer<typeof customerDocumentUploadSchema>

/**
 * Revisao feita pelo admin. Recusar sem escrever o motivo deixaria o cliente
 * sem saber o que corrigir, entao a observacao e obrigatoria nesse caso.
 */
export const customerDocumentReviewSchema = z
  .object({
    document_id: uuid,
    status: z.enum(['approved', 'rejected']),
    notes: optionalText(500),
  })
  .refine((data) => data.status !== 'rejected' || Boolean(data.notes), {
    message: 'Tell the customer why the document was rejected',
    path: ['notes'],
  })

export type CustomerDocumentReviewValues = z.infer<typeof customerDocumentReviewSchema>

/** Validacao de arquivo. Espelha os limites configurados nos buckets. */
export function validateUploadedFile(
  file: File | null,
  acceptedTypes: readonly string[] = ACCEPTED_DOCUMENT_TYPES,
): string | null {
  if (!file || file.size === 0) return 'Select a file to upload'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`
  }
  if (!acceptedTypes.includes(file.type)) {
    return 'Unsupported file type'
  }
  return null
}
