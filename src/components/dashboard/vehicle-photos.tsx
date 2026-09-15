'use client'

import Image from 'next/image'
import { ImagePlusIcon, Loader2Icon, StarIcon, Trash2Icon } from 'lucide-react'
import { useRef, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { idleResult } from '@/lib/actions/result'
import {
  deleteVehiclePhotoAction,
  setCoverPhotoAction,
  uploadVehiclePhotoAction,
} from '@/lib/actions/vehicles'
import { ACCEPTED_IMAGE_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export type ManagedPhoto = { id: string; url: string; isCover: boolean }

/**
 * Galeria do veiculo. Aceita varias fotos de uma vez, mas envia uma por vez:
 * cada upload e uma action independente, entao uma foto grande demais nao
 * derruba as outras, e o toast diz exatamente qual falhou.
 */
export function VehiclePhotos({ vehicleId, photos }: { vehicleId: string; photos: ManagedPhoto[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()

  const upload = (files: FileList | null) => {
    if (!files?.length) return

    startTransition(async () => {
      let uploaded = 0
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.set('vehicle_id', vehicleId)
        formData.set('file', file)
        const result = await uploadVehiclePhotoAction(idleResult, formData)
        if (result.ok) uploaded++
        else toast.error(`${file.name}: ${result.message}`)
      }
      if (uploaded) toast.success(`${uploaded} ${uploaded === 1 ? 'photo' : 'photos'} uploaded`)
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await action()
      if (result.ok) toast.success(result.message ?? 'Done')
      else toast.error(result.message ?? 'Something went wrong')
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
        <CardDescription>
          The cover photo is used in the fleet grid. JPG, PNG, WebP or AVIF up to 10 MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
              <Image src={photo.url} alt="" fill sizes="240px" className="object-cover" />
              {photo.isCover && (
                <span className="gold-plate absolute left-2 top-2 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-neutral-950">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                {!photo.isCover && (
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    aria-label="Make cover photo"
                    disabled={pending}
                    onClick={() => run(() => setCoverPhotoAction(photo.id))}
                  >
                    <StarIcon />
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Delete photo"
                  disabled={pending}
                  onClick={() => run(() => deleteVehiclePhotoAction(photo.id))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </li>
          ))}

          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className={cn(
                'flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground outline-none transition-colors hover:border-brand/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                pending && 'cursor-wait opacity-70',
              )}
            >
              {pending ? <Loader2Icon className="size-5 animate-spin" /> : <ImagePlusIcon className="size-5" />}
              {pending ? 'Working…' : 'Add photos'}
            </button>
          </li>
        </ul>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => upload(event.target.files)}
        />
      </CardContent>
    </Card>
  )
}
