import { SIGNED_URL_TTL, STORAGE_BUCKETS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export { vehiclePhotoUrl } from '@/lib/storage-url'

/**
 * Caminhos no Storage.
 *
 * customer-docs usa `<profile_id>/...` porque a policy autoriza pela primeira
 * pasta do caminho (storage.foldername(name)[1]). Mudar esse formato quebra a
 * autorizacao -- por isso a montagem do caminho mora so aqui.
 */

/** Remove acentos e caracteres que o Storage rejeita, preservando a extensao. */
export function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()

  return normalized.slice(-80) || 'file'
}

function uniquePrefix(): string {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}

export function buildVehiclePhotoPath(vehicleId: string, fileName: string): string {
  return `vehicles/${vehicleId}/${uniquePrefix()}-${sanitizeFileName(fileName)}`
}

export function buildVehicleDocumentPath(vehicleId: string, fileName: string): string {
  return `vehicles/${vehicleId}/${uniquePrefix()}-${sanitizeFileName(fileName)}`
}

export function buildCustomerDocumentPath(profileId: string, fileName: string): string {
  return `${profileId}/${uniquePrefix()}-${sanitizeFileName(fileName)}`
}


/**
 * Link temporario para documento privado. Nunca exponha o caminho cru na UI:
 * sem assinatura o bucket recusa, e com assinatura o link expira sozinho.
 */
export async function createSignedUrl(
  bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS],
  path: string,
  expiresIn: number = SIGNED_URL_TTL,
  /** Nome do arquivo para forcar o download em vez de abrir no navegador. */
  downloadAs?: string,
  /** Reduz a imagem no proprio Storage: o preview nao precisa do original. */
  preview = false,
): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, {
      ...(downloadAs ? { download: downloadAs } : {}),
      ...(preview ? { transform: { width: 1200, quality: 65 } } : {}),
    })

  if (error) return null
  return data?.signedUrl ?? null
}
