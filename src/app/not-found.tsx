import Link from 'next/link'

import { BrandMark } from '@/components/site/brand-mark'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandMark size="md" />
      <div className="space-y-2">
        <p className="eyebrow text-brand">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">This page took a wrong turn</h1>
        <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or is no longer available.</p>
      </div>
      <Link href="/" className={cn(buttonVariants(), 'h-10 px-5')}>
        Back to the fleet
      </Link>
    </main>
  )
}
