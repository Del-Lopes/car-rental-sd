import { MAX_UPLOAD_BYTES } from '@/lib/constants'

/**
 * Reducao de foto no navegador, antes do upload.
 *
 * A Vercel recusa corpos acima de 4,5 MB antes de a action rodar, e foto de
 * celular passa disso com facilidade. Reduzida para 2400px em JPEG, uma foto de
 * documento fica entre 0,5 e 1,5 MB e continua perfeitamente legivel.
 */

const MAX_DIMENSION = 2400
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024
const SHRINKABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export async function shrinkImage(file: File): Promise<File> {
  if (!SHRINKABLE_TYPES.includes(file.type) || file.size <= SHRINK_ABOVE_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) return file
    // PNG transparente viraria fundo preto no JPEG.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file

    const name = `${file.name.replace(/\.[^.]+$/, '')}.jpg`
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    // Formato que o navegador nao decodifica: segue o original e o limite decide.
    return file
  }
}

/** Mensagem para o que continua grande demais depois da reducao (PDF, em geral). */
export function oversizeMessage(file: File): string | null {
  if (file.size <= MAX_UPLOAD_BYTES) return null
  const limit = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)
  return file.type === 'application/pdf'
    ? `${file.name} is larger than ${limit} MB. Upload a photo of the document instead, or a smaller PDF.`
    : `${file.name} is larger than ${limit} MB.`
}
