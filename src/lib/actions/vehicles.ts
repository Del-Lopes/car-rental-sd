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

/**
 * Apaga o veiculo de vez, com as fotos e os arquivos de registration no Storage.
 *
 * Ordem importa: primeiro o banco, depois o Storage. Se fosse o contrario e o
 * banco recusasse a exclusao, o carro continuaria cadastrado com as fotos ja
 * apagadas. Assim, no pior caso (falha so no Storage) sobram arquivos orfaos --
 * espaco desperdicado, mas nenhum dado quebrado.
 *
 * Carro com historico de locacao nao pode ser apagado: o banco bloqueia
 * (on delete restrict) para nao perder o registro de recebimentos. Nesse caso a
 * saida e arquivar.
 */
export async function deleteVehicleAction(vehicleId: string): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()

  const { count: rentalCount, error: rentalError } = await supabase
    .from('rentals')
    .select('id', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)

  if (rentalError) return failure(rentalError.message)
  if ((rentalCount ?? 0) > 0) {
    return failure(
      'This vehicle has rental history and cannot be deleted, so the payment records are kept. Archive it instead.',
    )
  }

  // Caminhos registrados no banco, lidos antes de o delete em cascata apagar as linhas.
  const [{ data: photos }, { data: documents }] = await Promise.all([
    supabase.from('vehicle_photos').select('storage_path').eq('vehicle_id', vehicleId),
    supabase.from('vehicle_documents').select('file_path').eq('vehicle_id', vehicleId),
  ])

  const { data: deleted, error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)
    .select('id')
    .maybeSingle()

  if (error) return failure(translateDbError(error.message))
  if (!deleted) return failure('Vehicle not found')

  const photoPaths = await collectStoragePaths(
    STORAGE_BUCKETS.vehiclePhotos,
    vehicleId,
    (photos ?? []).map((photo) => photo.storage_path),
  )
  const documentPaths = await collectStoragePaths(
    STORAGE_BUCKETS.vehicleDocs,
    vehicleId,
    (documents ?? []).map((doc) => doc.file_path).filter((path): path is string => Boolean(path)),
  )

  const results = await Promise.all([
    photoPaths.length
      ? supabase.storage.from(STORAGE_BUCKETS.vehiclePhotos).remove(photoPaths)
      : Promise.resolve({ error: null }),
    documentPaths.length
      ? supabase.storage.from(STORAGE_BUCKETS.vehicleDocs).remove(documentPaths)
      : Promise.resolve({ error: null }),
  ])

  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/vehicles')

  const storageFailed = results.some((result) => result.error)
  redirect(`/dashboard/vehicles?deleted=${storageFailed ? 'partial' : '1'}`)
}

/**
 * Junta os caminhos conhecidos pelo banco com o que existe de fato na pasta do
 * veiculo. A pasta pega tambem arquivos orfaos de uploads que falharam no meio
 * (arquivo subiu, linha no banco nao) -- sem isso esse espaco nunca seria liberado.
 */
async function collectStoragePaths(
  bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS],
  vehicleId: string,
  knownPaths: string[],
): Promise<string[]> {
  const supabase = await createClient()
  const folder = `vehicles/${vehicleId}`
  const { data: listed } = await supabase.storage.from(bucket).list(folder, { limit: 1000 })

  const fromFolder = (listed ?? [])
    // Entradas sem id sao subpastas, nao arquivos.
    .filter((item) => item.id)
    .map((item) => `${folder}/${item.name}`)

  return [...new Set([...knownPaths, ...fromFolder])]
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
  // Locacao criada entre a checagem e a exclusao: o banco barra pela chave estrangeira.
  if (message.includes('rentals_vehicle_id_fkey')) {
    return 'This vehicle has rental history and cannot be deleted. Archive it instead.'
  }
  if (message.includes('violates row-level security')) {
    return 'You do not have permission to perform this action'
  }
  return message
}
