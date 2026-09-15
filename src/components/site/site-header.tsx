import Link from 'next/link'

import { BrandMark } from '@/components/site/brand-mark'
import { ThemeToggle } from '@/components/site/theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { getCurrentProfile } from '@/lib/auth'
import { PUBLIC_NAV } from '@/lib/site'
import { cn } from '@/lib/utils'

export async function SiteHeader() {
  const profile = await getCurrentProfile()

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <BrandMark size="sm" />
          <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {profile ? (
            <Link href="/dashboard" className={cn(buttonVariants(), 'h-9 px-3.5')}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost' }), 'hidden h-9 px-3 sm:inline-flex')}
              >
                Sign in
              </Link>
              <Link href="/register" className={cn(buttonVariants(), 'h-9 px-3.5')}>
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
