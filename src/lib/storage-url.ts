import { STORAGE_BUCKETS } from '@/lib/constants'
import { SUPABASE_URL } from '@/lib/env'

/**
 * URL direta do bucket publico de fotos -- nao precisa de assinatura.
 * Fica fora de storage.ts porque aquele modulo importa o client de servidor,
 * e esta funcao tambem e usada em Client Components.
 */
export function vehiclePhotoUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKETS.vehiclePhotos}/${storagePath}`
}
