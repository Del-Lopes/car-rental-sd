import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArchiveRestoreIcon, ExternalLinkIcon, ParkingSquareIcon, Trash2Icon } from 'lucide-react'

import { ConfirmActionButton } from '@/components/dashboard/confirm-action-button'
import { PageHeader } from '@/components/dashboard/page-header'
import { RegistrationCard } from '@/components/dashboard/registration-card'
import { RentalPanel } from '@/components/dashboard/rental-panel'
import { ToneBadge, UrgencyBadge, VehicleStatusBadge } from '@/components/dashboard/status-badges'
import { VehicleForm } from '@/components/dashboard/vehicle-form'
import { VehiclePhotos } from '@/components/dashboard/vehicle-photos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { deleteVehicleAction, setVehicleReserveAction, updateVehicleAction } from '@/lib/actions/vehicles'
import { requireAdmin } from '@/lib/auth'
import { getAgreementForRental } from '@/lib/data/agreements'
import { listCustomers } from '@/lib/data/customers'
import { getVehicleCategories } from '@/lib/data/lookups'
import { getActiveRentalForVehicle, listRentalPayments } from '@/lib/data/rentals'
import { currentDocument, getVehicleForAdmin, sortedPhotos } from '@/lib/data/vehicles'
import { daysUntil, urgencyFor } from '@/lib/expiry'
import { formatDaysToExpire, formatMonthYear, vehicleTitle } from '@/lib/format'
import { vehiclePhotoUrl } from '@/lib/storage-url'
import { cn } from '@/lib/utils'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const vehicle = await getVehicleForAdmin(id)
  return { title: vehicle ? vehicleTitle(vehicle) : 'Vehicle' }
}

export default async function EditVehiclePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<{ created?: string }>
}) {
  await requireAdmin()
  const [{ id }, { created }] = await Promise.all([params, searchParams])
  const [vehicle, categories, rental, customers] = await Promise.all([
    getVehicleForAdmin(id),
    getVehicleCategories(),
    getActiveRentalForVehicle(id),
    listCustomers(),
  ])

  if (!vehicle) notFound()

  const [payments, agreement] = rental
    ? await Promise.all([listRentalPayments(rental.id), getAgreementForRental(rental.id)])
    : [[], null]

  const registration = currentDocument(vehicle.vehicle_documents, 'registration')
  const days = registration?.expires_at ? daysUntil(registration.expires_at) : null
  const urgency = days !== null ? urgencyFor(days) : null

  const photos = sortedPhotos(vehicle).map((photo) => ({
    id: photo.id,
    url: vehiclePhotoUrl(photo.storage_path),
    isCover: photo.is_cover,
  }))

  return (
    <>
      <PageHeader
        title={vehicleTitle(vehicle)}
        back={{ href: '/dashboard/vehicles', label: 'Vehicles' }}
        actions={
          <>
            <VehicleStatusBadge status={vehicle.status} />
            {vehicle.status === 'available' && (
              <Link
                href={`/vehicles/${vehicle.id}`}
                target="_blank"
                className={cn(buttonVariants({ variant: 'outline' }), 'h-9 px-3')}
              >
                <ExternalLinkIcon />
                View on site
              </Link>
            )}
            {vehicle.status === 'reserve' ? (
              <ConfirmActionButton
                action={setVehicleReserveAction.bind(null, vehicle.id, false)}
                title="Return this vehicle to the fleet?"
                description="It becomes available again and shows up on the public site."
                confirmLabel="Return to fleet"
                variant="outline"
                confirmVariant="default"
                className="h-9 px-3"
              >
                <ArchiveRestoreIcon />
                Return to fleet
              </ConfirmActionButton>
            ) : (
              vehicle.status === 'available' && (
                <ConfirmActionButton
                  action={setVehicleReserveAction.bind(null, vehicle.id, true)}
                  title="Move this vehicle to reserve?"
                  description="It leaves the public site but stays exactly the same in the dashboard: registration alerts, counts and rentals keep working."
                  confirmLabel="Move to reserve"
                  variant="outline"
                  confirmVariant="default"
                  className="h-9 px-3"
                >
                  <ParkingSquareIcon />
                  Move to reserve
                </ConfirmActionButton>
              )
            )}
            <ConfirmActionButton
              action={deleteVehicleAction.bind(null, vehicle.id)}
              title="Delete this vehicle permanently?"
              description={`${vehicleTitle(vehicle)} will be removed along with ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} and its registration files. This cannot be undone. Vehicles with rental history can only be moved to reserve.`}
              confirmLabel="Delete permanently"
              variant="destructive"
              className="h-9 px-3"
            >
              <Trash2Icon />
              Delete
            </ConfirmActionButton>
          </>
        }
      />

      {created && (
        <Alert className="mb-6 border-brand/30 bg-brand/5">
          <AlertDescription>
            Vehicle saved. Add photos and the registration below to finish setting it up.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="order-2 space-y-6 xl:order-1">
          <VehicleForm
            action={updateVehicleAction.bind(null, vehicle.id)}
            categories={categories}
            vehicle={vehicle}
            submitLabel="Save changes"
            statusLocked={Boolean(rental)}
          />
        </div>

        <div className="order-1 space-y-6 xl:order-2">
          <RentalPanel
            vehicleId={vehicle.id}
            weeklyRate={vehicle.weekly_rate}
            monthlyRate={vehicle.monthly_rate}
            securityDeposit={vehicle.security_deposit}
            rental={rental}
            payments={payments}
            agreement={
              agreement && {
                id: agreement.id,
                status: agreement.status,
                signedAt: agreement.signed_at,
                insuranceChoice: agreement.insurance_choice,
              }
            }
            customers={customers.map((customer) => ({
              id: customer.profile_id,
              name: customer.full_name ?? customer.email ?? 'Customer',
            }))}
          />
          <RegistrationCard
            vehicleId={vehicle.id}
            registration={registration}
            status={
              registration?.expires_at && urgency && days !== null ? (
                <>
                  <ToneBadge tone="neutral">{formatMonthYear(registration.expires_at)}</ToneBadge>
                  <UrgencyBadge
                    urgency={urgency}
                    label={urgency === 'ok' ? 'Up to date' : `${days < 0 ? 'Expired' : 'Expires'} ${formatDaysToExpire(days)}`}
                  />
                </>
              ) : (
                <ToneBadge tone="danger">Missing</ToneBadge>
              )
            }
          />
          <VehiclePhotos vehicleId={vehicle.id} photos={photos} />
        </div>
      </div>
    </>
  )
}
