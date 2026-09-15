import Image from 'next/image'

import { VehicleImagePlaceholder } from '@/components/site/vehicle-image-placeholder'
import { vehiclePhotoUrl } from '@/lib/storage-url'
import type { VehiclePhoto } from '@/lib/types/database'
import { cn } from '@/lib/utils'

/**
 * Foto do veiculo, com um placeholder de marca enquanto o cliente nao envia
 * as fotos reais (pendencia C2). O placeholder mantem a proporcao para a grade
 * nao "pular" quando as fotos chegarem.
 */
export function VehicleImage({
  photo,
  alt,
  priority = false,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  className,
}: {
  photo: VehiclePhoto | null
  alt: string
  priority?: boolean
  sizes?: string
  className?: string
}) {
  return (
    <div className={cn('relative aspect-[16/10] overflow-hidden bg-muted', className)}>
      {photo ? (
        <Image
          src={vehiclePhotoUrl(photo.storage_path)}
          alt={photo.alt_text ?? alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <VehicleImagePlaceholder alt={alt} />
      )}
    </div>
  )
}
