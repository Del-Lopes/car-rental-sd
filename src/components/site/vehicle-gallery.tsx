'use client'

import Image from 'next/image'
import { useState } from 'react'

import { VehicleImagePlaceholder } from '@/components/site/vehicle-image-placeholder'
import { cn } from '@/lib/utils'

export type GalleryPhoto = { id: string; url: string; alt: string }

export function VehicleGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = photos[activeIndex]

  if (!active) {
    return (
      <div className="aspect-[16/10] overflow-hidden rounded-xl border border-border">
        <VehicleImagePlaceholder alt={title} large />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
        <Image
          key={active.id}
          src={active.url}
          alt={active.alt}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
      </div>

      {photos.length > 1 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Photos">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === activeIndex}
                className={cn(
                  'relative block aspect-[4/3] w-full overflow-hidden rounded-md border-2 outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50',
                  index === activeIndex ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <Image src={photo.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
