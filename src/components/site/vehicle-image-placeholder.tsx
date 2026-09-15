import { CarFrontIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Placeholder de marca usado enquanto o veiculo ainda nao tem fotos. */
export function VehicleImagePlaceholder({ alt, large = false }: { alt: string; large?: boolean }) {
  return (
    <div
      role="img"
      aria-label={`${alt} — photo coming soon`}
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted via-card to-muted text-muted-foreground"
    >
      <CarFrontIcon className={cn('text-brand/60', large ? 'size-16' : 'size-10')} strokeWidth={1.25} />
      <span className="eyebrow text-[0.6rem]">Photo coming soon</span>
    </div>
  )
}
