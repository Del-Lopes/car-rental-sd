import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangleIcon,
  CarFrontIcon,
  CheckCircle2Icon,
  FileClockIcon,
  UsersRoundIcon,
  WrenchIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { ToneBadge, UrgencyBadge } from '@/components/dashboard/status-badges'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireProfile } from '@/lib/auth'
import { EXPIRY_HORIZON_DAYS } from '@/lib/constants'
import { getDashboardStats, getExpiringVehicleDocuments, groupByUrgency } from '@/lib/data/dashboard'
import { formatDaysToExpire, formatMonthYear } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Overview' }

export default async function DashboardHomePage() {
  const profile = await requireProfile()

  // A area do cliente comeca pelos documentos; o overview e so do admin.
  if (profile.role !== 'admin') redirect('/dashboard/documents')

  const [stats, expiring] = await Promise.all([getDashboardStats(), getExpiringVehicleDocuments()])
  const groups = groupByUrgency(expiring)
  const firstName = profile.full_name?.split(' ')[0]

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Overview'}
        description="Registrations that need attention and the state of the fleet."
      />

      {stats.vehicle_docs_expired > 0 && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm"
        >
          <AlertTriangleIcon className="size-4 shrink-0 text-red-600 dark:text-red-300" />
          <span className="flex-1">
            <strong className="font-semibold">
              {stats.vehicle_docs_expired} {stats.vehicle_docs_expired === 1 ? 'registration has' : 'registrations have'} expired.
            </strong>{' '}
            Renew before those vehicles go back on the road.
          </span>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CarFrontIcon} label="Vehicles" value={stats.vehicles_total} detail={`${stats.vehicles_available} available`} href="/dashboard/vehicles" />
        <StatCard icon={WrenchIcon} label="Rented · Maintenance" value={`${stats.vehicles_rented} · ${stats.vehicles_maintenance}`} detail="out of the fleet" href="/dashboard/vehicles" />
        <StatCard icon={UsersRoundIcon} label="Customers" value={stats.customers_total} detail="registered" href="/dashboard/customers" />
        <StatCard
          icon={FileClockIcon}
          label="Documents to review"
          value={stats.customer_docs_pending}
          detail={stats.customer_docs_pending ? 'awaiting approval' : 'all caught up'}
          href="/dashboard/customers"
          highlight={stats.customer_docs_pending > 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming registration expirations</CardTitle>
          <CardDescription>Expired and expiring in the next {EXPIRY_HORIZON_DAYS} days, most urgent first.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <CheckCircle2Icon className="size-8 text-emerald-500" strokeWidth={1.5} />
              <p className="font-medium">All registrations are up to date</p>
              <p className="text-sm text-muted-foreground">Nothing expires in the next {EXPIRY_HORIZON_DAYS} days.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Vehicle</TableHead>
                  <TableHead className="hidden sm:table-cell">Plate</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="pr-6 text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              {groups.map((group) => (
                <TableBody key={group.urgency}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={4} className="pl-6">
                      <span className="flex items-center gap-2">
                        <UrgencyBadge urgency={group.urgency} />
                        <span className="text-xs text-muted-foreground">
                          {group.documents.length} {group.documents.length === 1 ? 'vehicle' : 'vehicles'}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="pl-6">
                        <Link href={`/dashboard/vehicles/${doc.vehicle_id}`} className="font-medium hover:text-brand">
                          {doc.year} {doc.make} {doc.model}
                        </Link>
                        {doc.doc_number && (
                          <span className="block text-xs text-muted-foreground">{doc.doc_number}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs sm:table-cell">{doc.plate ?? '—'}</TableCell>
                      <TableCell className="tabular-nums">{formatMonthYear(doc.expires_at)}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <ToneBadge tone={doc.days_to_expire < 0 ? 'danger' : 'neutral'}>
                          {doc.days_to_expire < 0 ? `Expired ${formatDaysToExpire(doc.days_to_expire)}` : formatDaysToExpire(doc.days_to_expire)}
                        </ToneBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ))}
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  detail: string
  href: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: 'outline' }),
        'h-auto flex-col items-start gap-3 whitespace-normal rounded-xl bg-card p-4 text-left dark:bg-card',
        highlight && 'border-brand/40',
      )}
    >
      <span className="flex w-full items-center justify-between text-xs font-normal text-muted-foreground">
        {label}
        <Icon className={cn('size-4', highlight && 'text-brand')} />
      </span>
      <span>
        <span className="block text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        <span className="text-xs font-normal text-muted-foreground">{detail}</span>
      </span>
    </Link>
  )
}
