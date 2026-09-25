import type { Metadata } from 'next'
import Link from 'next/link'
import { CarFrontIcon, PlusIcon } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { UrgencyBadge, VehicleStatusBadge } from '@/components/dashboard/status-badges'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { VehicleImage } from '@/components/site/vehicle-image'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { listActiveRentals } from '@/lib/data/rentals'
import { coverPhoto, currentDocument, listVehiclesForAdmin } from '@/lib/data/vehicles'
import { daysUntil, urgencyFor } from '@/lib/expiry'
import { formatCurrency, formatMonthYear, vehicleTitle } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Vehicles' }

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>
}) {
  await requireAdmin()
  const [vehicles, activeRentals, { deleted }] = await Promise.all([
    listVehiclesForAdmin(),
    listActiveRentals(),
    searchParams,
  ])

  // Plano em vigor por carro: a coluna correspondente fica em destaque.
  const planByVehicle = new Map(activeRentals.map((rental) => [rental.vehicle_id, rental.plan]))

  return (
    <>
      {deleted && (
        <Alert className={cn('mb-6', deleted === 'partial' ? 'border-amber-500/30 bg-amber-500/10' : 'border-brand/30 bg-brand/5')}>
          <AlertDescription>
            {deleted === 'partial'
              ? 'Vehicle deleted, but some files could not be removed from storage. They take up space but do not affect the site.'
              : 'Vehicle deleted, along with its photos and files.'}
          </AlertDescription>
        </Alert>
      )}

      <PageHeader
        title="Vehicles"
        description={`${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'} in the fleet`}
        actions={
          <Link href="/dashboard/vehicles/new" className={cn(buttonVariants(), 'h-9 px-3.5')}>
            <PlusIcon />
            Add vehicle
          </Link>
        }
      />

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <CarFrontIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">No vehicles yet</p>
          <p className="text-sm text-muted-foreground">Add the first car to start building the fleet.</p>
          <Link href="/dashboard/vehicles/new" className={cn(buttonVariants(), 'mt-2 h-9 px-4')}>
            Add vehicle
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Plate</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Weekly</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Monthly</TableHead>
                <TableHead className="hidden pr-4 sm:table-cell">Registration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
                const registration = currentDocument(vehicle.vehicle_documents, 'registration')
                const days = registration?.expires_at ? daysUntil(registration.expires_at) : null
                const rentedPlan = planByVehicle.get(vehicle.id)

                return (
                  <TableRow key={vehicle.id} className="group">
                    <TableCell className="pl-4">
                      <Link href={`/dashboard/vehicles/${vehicle.id}`} className="flex items-center gap-3">
                        <VehicleImage
                          photo={coverPhoto(vehicle)}
                          alt={vehicleTitle(vehicle)}
                          sizes="64px"
                          className="w-16 shrink-0 rounded-md [&_span]:hidden [&_svg]:size-5"
                        />
                        <span>
                          <span className="block font-medium group-hover:text-brand">
                            {vehicle.make} {vehicle.model}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {vehicle.year} · {vehicle.vehicle_categories?.label ?? '—'}
                          </span>
                          {/* No celular a tabela nao comporta colunas de preco: elas vem aqui. */}
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums sm:hidden">
                            <Rate value={vehicle.weekly_rate} active={rentedPlan === 'weekly'} suffix="/wk" />
                            <Rate value={vehicle.monthly_rate} active={rentedPlan === 'monthly'} suffix="/mo" />
                            {registration?.expires_at && days !== null ? (
                              <>
                                <span className="text-muted-foreground">Reg. {formatMonthYear(registration.expires_at)}</span>
                                {urgencyFor(days) !== 'ok' && <UrgencyBadge urgency={urgencyFor(days)} />}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Not registered</span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <VehicleStatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">{vehicle.plate ?? '—'}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      <Rate value={vehicle.weekly_rate} active={rentedPlan === 'weekly'} />
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      <Rate value={vehicle.monthly_rate} active={rentedPlan === 'monthly'} />
                    </TableCell>
                    <TableCell className="hidden pr-4 sm:table-cell">
                      {registration?.expires_at && days !== null ? (
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums">{formatMonthYear(registration.expires_at)}</span>
                          {urgencyFor(days) !== 'ok' && <UrgencyBadge urgency={urgencyFor(days)} />}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not registered</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

/**
 * Preco do plano. Quando o carro esta alugado naquele plano, o valor ganha
 * destaque: basta bater o olho para saber se a locacao e semanal ou mensal.
 */
function Rate({ value, active, suffix }: { value: number; active: boolean; suffix?: string }) {
  return (
    <span
      className={cn(
        active && 'rounded-md bg-brand/15 px-2 py-1 font-semibold text-brand ring-1 ring-inset ring-brand/30',
      )}
      title={active ? 'Current rental plan' : undefined}
    >
      {active && <span className="sr-only">Current rental plan: </span>}
      {formatCurrency(value)}
      {suffix}
    </span>
  )
}
