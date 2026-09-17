import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CarFrontIcon,
  CheckCircle2Icon,
  FileClockIcon,
  FileSignatureIcon,
  ScrollTextIcon,
  UsersRoundIcon,
  WrenchIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { RecordPaymentButton } from '@/components/dashboard/record-payment-button'
import { PaymentUrgencyBadge, ToneBadge, UrgencyBadge } from '@/components/dashboard/status-badges'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireProfile } from '@/lib/auth'
import {
  EXPIRY_HORIZON_DAYS,
  PAYMENT_HORIZON_DAYS,
  PAYMENT_URGENCY_META,
  RENTAL_PLAN_META,
} from '@/lib/constants'
import { getCurrentTerms } from '@/lib/data/agreements'
import { getDashboardStats, getExpiringVehicleDocuments, groupByUrgency } from '@/lib/data/dashboard'
import { listDueRentals } from '@/lib/data/rentals'
import { currentDocument, listVehiclesForAdmin } from '@/lib/data/vehicles'
import { formatCurrency, formatDate, formatDaysToExpire, formatMonthYear } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Overview' }

export default async function DashboardHomePage() {
  const profile = await requireProfile()

  // A area do cliente comeca pelos documentos; o overview e so do admin.
  if (profile.role !== 'admin') redirect('/dashboard/documents')

  const [stats, expiring, dueRentals, currentTerms, fleet] = await Promise.all([
    getDashboardStats(),
    getExpiringVehicleDocuments(),
    listDueRentals(),
    getCurrentTerms(),
    listVehiclesForAdmin(),
  ])
  const groups = groupByUrgency(expiring)
  // Carro na frota sem registration nao tem data para vencer, entao nunca
  // apareceria na lista de vencimentos -- e e justamente o caso mais arriscado.
  const missingRegistration = fleet.filter(
    (vehicle) => !currentDocument(vehicle.vehicle_documents, 'registration'),
  )
  const firstName = profile.full_name?.split(' ')[0]
  const overduePayments = dueRentals.filter((rental) => rental.urgency === 'overdue')

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Overview'}
        description="Payments, registrations and the state of the fleet."
      />

      {!currentTerms && (
        <Link
          href="/dashboard/terms"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm hover:border-amber-500/50"
        >
          <ScrollTextIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="flex-1">
            <strong className="font-semibold">Publish your rental terms.</strong> Customers can&apos;t sign
            rental agreements until the first version is published.
          </span>
          <span className="text-xs font-medium">Set up terms →</span>
        </Link>
      )}

      {stats.agreements_pending > 0 && (
        <Link
          href="/dashboard/agreements"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-brand/40"
        >
          <FileSignatureIcon className="size-4 shrink-0 text-brand" />
          <span className="flex-1">
            <strong className="font-semibold">
              {stats.agreements_pending}{' '}
              {stats.agreements_pending === 1 ? 'rental agreement is' : 'rental agreements are'} awaiting
              customer signature.
            </strong>
          </span>
          <span className="text-xs font-medium text-brand">View →</span>
        </Link>
      )}

      {overduePayments.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm"
        >
          <BanknoteIcon className="size-4 shrink-0 text-red-600 dark:text-red-300" />
          <span className="flex-1">
            <strong className="font-semibold">
              {overduePayments.length}{' '}
              {overduePayments.length === 1 ? 'payment is overdue' : 'payments are overdue'}.
            </strong>{' '}
            Total expected: {formatCurrency(overduePayments.reduce((sum, r) => sum + Number(r.total_amount), 0))}.
          </span>
        </div>
      )}

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

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={BanknoteIcon}
          label="Payments"
          value={stats.payments_overdue > 0 ? stats.payments_overdue : stats.payments_due_soon}
          detail={stats.payments_overdue > 0 ? 'overdue' : `due in ${PAYMENT_HORIZON_DAYS} days`}
          href="#rentals"
          highlight={stats.payments_overdue > 0}
        />
        <StatCard icon={CarFrontIcon} label="Vehicles" value={stats.vehicles_total} detail={`${stats.vehicles_available} available${stats.vehicles_reserve ? ` · ${stats.vehicles_reserve} in reserve` : ''}`} href="/dashboard/vehicles" />
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

      <Card id="rentals" className="mb-6 scroll-mt-24">
        <CardHeader>
          <CardTitle>Rented vehicles and payments</CardTitle>
          <CardDescription>
            Active rentals with a payment due in the next {PAYMENT_HORIZON_DAYS} days, or already
            overdue. Amounts are recorded by hand.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {dueRentals.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <CheckCircle2Icon className="size-8 text-emerald-500" strokeWidth={1.5} />
              <p className="font-medium">
                {stats.rentals_active > 0 ? 'No payments due right now' : 'No active rentals'}
              </p>
              <p className="text-sm text-muted-foreground">
                {stats.rentals_active > 0
                  ? `${stats.rentals_active} active ${stats.rentals_active === 1 ? 'rental' : 'rentals'}, all paid up.`
                  : 'Open a vehicle and use "Rent this vehicle out" to start one.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Vehicle</TableHead>
                  <TableHead>Renter</TableHead>
                  <TableHead className="hidden sm:table-cell">Plan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dueRentals.map((rental) => (
                  <TableRow key={rental.id}>
                    <TableCell className="pl-6">
                      <Link href={`/dashboard/vehicles/${rental.vehicle_id}`} className="font-medium hover:text-brand">
                        {rental.year} {rental.make} {rental.model}
                      </Link>
                      {rental.plate && (
                        <span className="block font-mono text-xs text-muted-foreground">{rental.plate}</span>
                      )}
                    </TableCell>
                    <TableCell>{rental.renter}</TableCell>
                    <TableCell className="hidden sm:table-cell">{RENTAL_PLAN_META[rental.plan].label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(rental.total_amount)}
                      {Number(rental.insurance_amount) > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          incl. {formatCurrency(rental.insurance_amount)} insurance
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="tabular-nums">{formatDate(rental.next_due_on)}</span>
                        <PaymentUrgencyBadge
                          urgency={rental.urgency}
                          label={
                            rental.days_to_due < 0
                              ? `Overdue ${formatDaysToExpire(rental.days_to_due)}`
                              : PAYMENT_URGENCY_META[rental.urgency].label
                          }
                        />
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <RecordPaymentButton
                        rentalId={rental.id}
                        amount={rental.total_amount}
                        insuranceAmount={rental.insurance_amount}
                        plan={rental.plan}
                        dueOn={rental.next_due_on}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming registration expirations</CardTitle>
          <CardDescription>
            Missing, expired and expiring in the next {EXPIRY_HORIZON_DAYS} days, most urgent first.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {missingRegistration.length > 0 && (
            <div className="border-y border-border">
              <div className="flex items-center gap-2 bg-muted/40 px-6 py-2.5">
                <ToneBadge tone="danger">No registration on file</ToneBadge>
                <span className="text-xs text-muted-foreground">
                  {missingRegistration.length} {missingRegistration.length === 1 ? 'vehicle' : 'vehicles'}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {missingRegistration.map((vehicle) => (
                  <li key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                    <span>
                      <span className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                      {vehicle.plate && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{vehicle.plate}</span>
                      )}
                    </span>
                    <Link href={`/dashboard/vehicles/${vehicle.id}`} className="text-xs font-medium text-brand hover:underline">
                      Add registration →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {groups.length === 0 && missingRegistration.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <CheckCircle2Icon className="size-8 text-emerald-500" strokeWidth={1.5} />
              <p className="font-medium">All registrations are up to date</p>
              <p className="text-sm text-muted-foreground">Nothing expires in the next {EXPIRY_HORIZON_DAYS} days.</p>
            </div>
          ) : groups.length > 0 ? (
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
          ) : null}
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
