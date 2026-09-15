'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CarFrontIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react'

import type { UserRole } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badgeKey?: BadgeKey }
type BadgeKey = 'overview' | 'customers'

const NAV: Record<UserRole, NavItem[]> = {
  admin: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboardIcon, exact: true, badgeKey: 'overview' },
    { href: '/dashboard/vehicles', label: 'Vehicles', icon: CarFrontIcon },
    { href: '/dashboard/customers', label: 'Customers', icon: UsersRoundIcon, badgeKey: 'customers' },
    { href: '/dashboard/account', label: 'Account', icon: UserRoundIcon },
  ],
  customer: [
    { href: '/dashboard/documents', label: 'My documents', icon: FileTextIcon },
    { href: '/dashboard/account', label: 'Account', icon: UserRoundIcon },
  ],
}

/**
 * Navegacao do painel. Os badges mostram o que pede acao: registrations
 * vencidas no Overview e documentos aguardando revisao em Customers.
 */
export function DashboardNav({
  role,
  badges = {},
  orientation = 'vertical',
}: {
  role: UserRole
  badges?: Partial<Record<BadgeKey, number>>
  orientation?: 'vertical' | 'horizontal'
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="Dashboard">
      <ul className={cn(orientation === 'vertical' ? 'space-y-1' : 'flex gap-1 overflow-x-auto')}>
        {NAV[role].map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badge = item.badgeKey ? badges[item.badgeKey] : undefined

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className={cn('size-4', active && 'text-brand')} />
                {item.label}
                {badge ? (
                  <span className="ml-auto rounded-full bg-brand px-1.5 text-[0.65rem] font-semibold leading-4 text-primary-foreground">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
