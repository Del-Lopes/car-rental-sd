import { z } from 'zod'

import { uuid } from '@/lib/validation/common'

export const publishTermsSchema = z.object({
  body: z
    .string()
    .trim()
    .min(50, 'The terms look too short. Paste the full text.')
    .max(100_000, 'The terms are too long'),
})

export const signAgreementSchema = z.object({
  agreement_id: uuid,
  terms_version_id: uuid,
  // Checkbox de HTML so envia "on" quando marcado.
  accepted: z.literal('on', { message: 'You must confirm that you read and agree to the terms' }),
  insurance_choice: z.enum(['own', 'carental'], { message: 'Choose how this rental will be insured' }),
  signed_name: z
    .string()
    .trim()
    .min(2, 'Type your full name to sign')
    .max(120, 'Name is too long'),
})
