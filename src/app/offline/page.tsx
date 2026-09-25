import type { Metadata } from 'next'
import Link from 'next/link'
import { WifiOffIcon } from 'lucide-react'

import { BrandMark } from '@/components/site/brand-mark'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'You are offline',
  robots: { index: false, follow: false },
}

/**
 * Mostrada pelo service worker quando o aparelho esta sem internet. Precisa ser
 * estatica: e servida do cache, sem passar pelo servidor.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <BrandMark />
      <WifiOffIcon className="size-10 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          Carental needs a connection to show the fleet and your account. Check your signal and try
          again.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants(), 'h-10 px-5')}>
        Try again
      </Link>
    </main>
  )
}
