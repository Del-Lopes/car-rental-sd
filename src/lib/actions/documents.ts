'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin, requireProfile } from '@/lib/auth'
import { STORAGE_BUCKETS } from '@/lib/constants'
import { PREVIEW_WRITE_MESSAGE, isPreviewMode } from '@/lib/preview'
import { createClient } from '@/lib/supabase/server'
import { buildCustomerDocumentPath } from '@/lib/storage'
import {
  customerDocumentReviewSchema,
  customerDocumentUploadSchema,
  validateUploadedFile,
} from '@/lib/validation/documents'
import { failure, success, validationFailure, type ActionResult } from '@/lib/actions/result'

/**
 * Documentos do locatario.
 *
 * O arquivo vai para `customer-docs/<profile_id>/...` porque a policy do
 * Storage autoriza pela primeira pasta do caminho. Gravar em outro lugar seria
 * recusado pelo proprio banco.
 */

export async function uploadCustomerDocumentAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = customerDocumentUploadSchema.safeParse({
    type_slug: formData.get('type_slug'),
    expires_at: formData.get('expires_at'),
  })
  if (!parsed.success) return validationFailure(parsed.error)

  const file = formData.get('file') as File | null
  const fileError = validateUploadedFile(file)
  if (fileError) return failure(fileError)

  const supabase = await createClient()
  const path = buildCustomerDocumentPath(profile.id, file!.name)

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.customerDocs)
    .upload(path, file!, { contentType: file!.type, upsert: false })

  if (uploadError) return failure(`Upload failed: ${uploadError.message}`)

  const { error } = await supabase.from('customer_documents').insert({
    profile_id: profile.id,
    type_slug: parsed.data.type_slug,
    expires_at: parsed.data.expires_at ?? null,
    file_path: path,
    file_name: file!.name,
  })

  if (error) {
    await supabase.storage.from(STORAGE_BUCKETS.customerDocs).remove([path])
    return failure(error.message)
  }

  revalidatePath('/dashboard/documents')
  revalidatePath('/dashboard')
  return success('Document sent for review')
}

/** Revisao do admin. O trigger no banco carimba quem revisou e quando. */
export async function reviewCustomerDocumentAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = customerDocumentReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customer_documents')
    .update({ status: parsed.data.status, notes: parsed.data.notes ?? null })
    .eq('id', parsed.data.document_id)
    .select('profile_id')
    .maybeSingle()

  if (error) return failure(error.message)
  if (!data) return failure('Document not found')

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/customers')
  revalidatePath(`/dashboard/customers/${data.profile_id}`)
  return success(parsed.data.status === 'approved' ? 'Document approved' : 'Document rejected')
}

/**
 * Remove o envio. A RLS permite ao dono apagar so enquanto estiver pendente --
 * depois de aprovado, quem apaga e o admin.
 */
export async function deleteCustomerDocumentAction(documentId: string): Promise<ActionResult> {
  await requireProfile()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()
  const { data: document } = await supabase
    .from('customer_documents')
    .select('id, profile_id, file_path')
    .eq('id', documentId)
    .maybeSingle()

  if (!document) return failure('Document not found')

  const { error } = await supabase.from('customer_documents').delete().eq('id', documentId)
  if (error) return failure(error.message)

  await supabase.storage.from(STORAGE_BUCKETS.customerDocs).remove([document.file_path])

  revalidatePath('/dashboard/documents')
  revalidatePath(`/dashboard/customers/${document.profile_id}`)
  return success('Document removed')
}
