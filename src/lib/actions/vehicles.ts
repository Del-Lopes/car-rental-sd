'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireAdmin } from '@/lib/auth'
import { ACCEPTED_IMAGE_TYPES, STORAGE_BUCKETS } from '@/lib/constants'
import { PREVIEW_WRITE_MESSAGE, isPreviewMode } from '@/lib/preview'
import { createClient } from '@/lib/supabase/server'
import { buildVehicleDocumentPath, buildVehiclePhotoPath } from '@/lib/storage'
import { validateUploadedFile } from '@/lib/validation/documents'
import { vehicleDocumentFormSchema, vehicleFormSchema } from '@/lib/validation/vehicle'
import { failure, success, validationFailure, type ActionResult } from '@/lib/actions/result'

/**
 * Mutacoes de veiculo. Toda action chama requireAdmin antes de tocar no banco;
 * a RLS repete a checagem do lado do Postgres, entao sao duas barreiras
 * independentes -- a UI nunca e a unica coisa protegendo os dados.
 */

function revalidateVehicle(vehicleId?: string) {
  revalidatePath('/')
  revalidatePath('/dashboard/vehicles')
  if (vehicleId) {
    revalidatePath(`/dashboard/vehicles/${vehicleId}`)
    revalidatePath(`/vehicles/${vehicleId}`)
  }
}

export async function createVehicleAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = vehicleFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) return failure(translateDbError(error.message))

  revalidateVehicle(data.id)
  // Fotos e registration dependem do id; o proximo passo natural e a edicao.
  redirect(`/dashboard/vehicles/${data.id}?created=1`)
}

export async function updateVehicleAction(
  vehicleId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = vehicleFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.from('vehicles').update(parsed.data).eq('id', vehicleId)

  if (error) return failure(translateDbError(error.message))

  revalidateVehicle(vehicleId)
  return success('Vehicle updated')
}

/**
 * Arquivar em vez de apagar: o veiculo some da vitrine e da lista, mas o
 * historico de documentos continua disponivel para consulta.
 */
export async function archiveVehicleAction(vehicleId: string): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()
  const { error } = await supabase
    .from('vehicles')
    .update({ status: 'archived' })
    .eq('id', vehicleId)

  if (error) return failure(translateDbError(error.message))

  revalidateVehicle(vehicleId)
  return success('Vehicle archived')
}

export async function uploadVehiclePhotoAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const vehicleId = String(formData.get('vehicle_id') ?? '')
  const file = formData.get('file') as File | null

  if (!vehicleId) return failure('Vehicle is required')

  const fileError = validateUploadedFile(file, ACCEPTED_IMAGE_TYPES)
  if (fileError) return failure(fileError)

  const supabase = await createClient()
  const path = buildVehiclePhotoPath(vehicleId, file!.name)

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.vehiclePhotos)
    .upload(path, file!, { contentType: file!.type, upsert: false })

  if (uploadError) return failure(`Upload failed: ${uploadError.message}`)

  const { count } = await supabase
    .from('vehicle_photos')
    .select('id', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)

  const isFirstPhoto = (count ?? 0) === 0

  const { error } = await supabase.from('vehicle_photos').insert({
    vehicle_id: vehicleId,
    storage_path: path,
    sort_order: count ?? 0,
    is_cover: isFirstPhoto,
  })

  if (error) {
    // Nao deixa arquivo orfao no bucket se a linha nao entrou.
    await supabase.storage.from(STORAGE_BUCKETS.vehiclePhotos).remove([path])
    return failure(translateDbError(error.message))
  }

  revalidateVehicle(vehicleId)
  return success('Photo uploaded')
}

export async function deleteVehiclePhotoAction(photoId: string): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()
  const { data: photo } = await supabase
    .from('vehicle_photos')
    .select('id, vehicle_id, storage_path')
    .eq('id', photoId)
    .maybeSingle()

  if (!photo) return failure('Photo not found')

  const { error } = await supabase.from('vehicle_photos').delete().eq('id', photoId)
  if (error) return failure(translateDbError(error.message))

  await supabase.storage.from(STORAGE_BUCKETS.vehiclePhotos).remove([photo.storage_path])

  revalidateVehicle(photo.vehicle_id)
  return success('Photo removed')
}

/** O indice unico vehicle_photos_single_cover exige limpar a capa anterior. */
export async function setCoverPhotoAction(photoId: string): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()
  const { data: photo } = await supabase
    .from('vehicle_photos')
    .select('id, vehicle_id')
    .eq('id', photoId)
    .maybeSingle()

  if (!photo) return failure('Photo not found')

  await supabase
    .from('vehicle_photos')
    .update({ is_cover: false })
    .eq('vehicle_id', photo.vehicle_id)
    .eq('is_cover', true)

  const { error } = await supabase
    .from('vehicle_photos')
    .update({ is_cover: true })
    .eq('id', photoId)

  if (error) return failure(translateDbError(error.message))

  revalidateVehicle(photo.vehicle_id)
  return success('Cover photo updated')
}

export async function saveVehicleDocumentAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = vehicleDocumentFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const documentId = formData.get('document_id')
  const file = formData.get('file') as File | null
  const supabase = await createClient()

  let filePath: string | null = null
  if (file && file.size > 0) {
    const fileError = validateUploadedFile(file)
    if (fileError) return failure(fileError)

    filePath = buildVehicleDocumentPath(parsed.data.vehicle_id, file.name)
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.vehicleDocs)
      .upload(filePath, file, { contentType: file.type, upsert: false })

    if (uploadError) return failure(`Upload failed: ${uploadError.message}`)
  }

  const payload = { ...parsed.data, ...(filePath ? { file_path: filePath } : {}) }

  const { error } = documentId
    ? await supabase.from('vehicle_documents').update(payload).eq('id', String(documentId))
    : await supabase.from('vehicle_documents').insert(payload)

  if (error) {
    if (filePath) {
      await supabase.storage.from(STORAGE_BUCKETS.vehicleDocs).remove([filePath])
    }
    return failure(translateDbError(error.message))
  }

  revalidatePath('/dashboard')
  revalidateVehicle(parsed.data.vehicle_id)
  return success('Document saved')
}

export async function deleteVehicleDocumentAction(documentId: string): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()
  const { data: document } = await supabase
    .from('vehicle_documents')
    .select('id, vehicle_id, file_path')
    .eq('id', documentId)
    .maybeSingle()

  if (!document) return failure('Document not found')

  const { error } = await supabase.from('vehicle_documents').delete().eq('id', documentId)
  if (error) return failure(translateDbError(error.message))

  if (document.file_path) {
    await supabase.storage.from(STORAGE_BUCKETS.vehicleDocs).remove([document.file_path])
  }

  revalidatePath('/dashboard')
  revalidateVehicle(document.vehicle_id)
  return success('Document removed')
}

/** Erros crus do Postgres nao servem para o operador da locadora ler. */
function translateDbError(message: string): string {
  if (message.includes('vehicles_plate_key')) return 'Another vehicle already uses this plate'
  if (message.includes('vehicles_vin_key')) return 'Another vehicle already uses this VIN'
  if (message.includes('violates row-level security')) {
    return 'You do not have permission to perform this action'
  }
  return message
}
