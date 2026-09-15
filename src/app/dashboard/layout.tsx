import type { Metadata } from 'next'

import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { UserMenu } from '@/components/dashboard/user-menu'
import { BrandMark } from '@/components/site/brand-mark'
import { PreviewBanner } from '@/components/site/preview-banner'
import { ThemeToggle } from '@/components/site/theme-toggle'
import { requireProfile } from '@/lib/auth'
import { getDashboardStats } from '@/lib/data/dashboard'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | Carental Dashboard' },
  robots: { index: false, follow: false },
}

/**
 * Nada no painel pode ser pre-renderizado ou cacheado: cada pagina depende de
 * quem esta logado. Normalmente a leitura de cookies ja torna a rota dinamica,
 * mas isso e implicito -- uma pagina que nao lesse cookie seria gerada no build
 * e servida igual para todo mundo. Aqui fica explicito para a arvore inteira.
 */
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  const isAdmin = profile.role === 'admin'

  // Os badges da navegacao so fazem sentido para o admin; o cliente nao paga
  // essa consulta.
  const stats = isAdmin ? await getDashboardStats() : null
  const badges = stats
    ? { overview: stats.vehicle_docs_expired, customers: stats.customer_docs_pending }
    : {}

  const displayName = profile.full_name ?? profile.email ?? 'Account'

  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBanner />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
          <div className="flex h-16 items-center px-5">
            <BrandMark size="sm" href="/dashboard" />
          </div>
          <div className="flex-1 px-3 py-4">
            <p className="eyebrow mb-3 px-3 text-[0.6rem] text-muted-foreground">
              {isAdmin ? 'Operations' : 'My account'}
            </p>
            <DashboardNav role={profile.role} badges={badges} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
              <span className="lg:hidden">
                <BrandMark size="sm" href="/dashboard" />
              </span>
              <span className="hidden text-sm text-muted-foreground lg:block">
                {isAdmin ? 'Admin' : 'Customer'} · {displayName}
              </span>
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <UserMenu name={displayName} email={profile.email} />
              </div>
            </div>
            <div className="border-t border-border px-2 py-1.5 lg:hidden">
              <DashboardNav role={profile.role} badges={badges} orientation="horizontal" />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
