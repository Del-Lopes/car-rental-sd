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
  const [vehicles, { deleted }] = await Promise.all([listVehiclesForAdmin(), searchParams])

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
                <TableHead className="text-right">Weekly</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Monthly</TableHead>
                <TableHead className="pr-4">Registration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
                const registration = currentDocument(vehicle.vehicle_documents, 'registration')
                const days = registration?.expires_at ? daysUntil(registration.expires_at) : null

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
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <VehicleStatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">{vehicle.plate ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(vehicle.weekly_rate)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {formatCurrency(vehicle.monthly_rate)}
                    </TableCell>
                    <TableCell className="pr-4">
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
