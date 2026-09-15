import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, CheckIcon, ShieldCheckIcon } from 'lucide-react'

import { VehicleCard } from '@/components/site/vehicle-card'
import { VehicleGallery } from '@/components/site/vehicle-gallery'
import { buttonVariants } from '@/components/ui/button'
import { getCurrentProfile } from '@/lib/auth'
import { FUEL_LABELS, TRANSMISSION_LABELS } from '@/lib/constants'
import { getPublicVehicle, listPublicVehicles, sortedPhotos } from '@/lib/data/vehicles'
import { formatCurrency, formatMileage, vehicleTitle } from '@/lib/format'
import { vehiclePhotoUrl } from '@/lib/storage-url'
import { cn } from '@/lib/utils'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const vehicle = await getPublicVehicle(id)
  if (!vehicle) return { title: 'Vehicle not found' }

  const title = vehicleTitle(vehicle)
  const description = `${title} for rent from ${formatCurrency(vehicle.weekly_rate)}/week or ${formatCurrency(vehicle.monthly_rate)}/month. Unlimited mileage.`

  return {
    title,
    description,
    alternates: { canonical: `/vehicles/${vehicle.id}` },
    openGraph: { title, description },
  }
}

export default async function VehicleDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const [vehicle, profile] = await Promise.all([getPublicVehicle(id), getCurrentProfile()])

  if (!vehicle) notFound()

  const title = vehicleTitle(vehicle)
  const photos = sortedPhotos(vehicle).map((photo, index) => ({
    id: photo.id,
    url: vehiclePhotoUrl(photo.storage_path),
    alt: photo.alt_text ?? `${title} — photo ${index + 1}`,
  }))

  const related = (await listPublicVehicles({ category: vehicle.category_slug }))
    .filter((item) => item.id !== vehicle.id)
    .slice(0, 3)

  const specs: Array<[string, string | null]> = [
    ['Category', vehicle.vehicle_categories?.label ?? null],
    ['Year', String(vehicle.year)],
    ['Transmission', TRANSMISSION_LABELS[vehicle.transmission]],
    ['Fuel', vehicle.fuel ? FUEL_LABELS[vehicle.fuel] : null],
    ['Seats', vehicle.seats ? String(vehicle.seats) : null],
    ['Doors', vehicle.doors ? String(vehicle.doors) : null],
    ['Color', vehicle.color],
    ['Mileage', vehicle.mileage !== null ? formatMileage(vehicle.mileage) : null],
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/#fleet"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to fleet
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-8">
          <VehicleGallery photos={photos} title={title} />

          <div className="space-y-3 lg:hidden">
            <VehicleHeading vehicle={vehicle} />
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Specifications</h2>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
              {specs
                .filter((spec): spec is [string, string] => Boolean(spec[1]))
                .map(([label, value]) => (
                  <div key={label} className="space-y-1 bg-card p-4">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {vehicle.description && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">About this vehicle</h2>
              <p className="leading-relaxed text-muted-foreground">{vehicle.description}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="hidden space-y-3 lg:block">
            <VehicleHeading vehicle={vehicle} />
          </div>

          <div className="space-y-5 rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <Price label="Weekly" value={vehicle.weekly_rate} highlight />
              <Price label="Monthly" value={vehicle.monthly_rate} />
            </div>

            <ul className="space-y-2.5 border-t border-border pt-5 text-sm">
              {vehicle.security_deposit !== null && (
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheckIcon className="size-4 text-brand" />
                    Security deposit
                  </span>
                  <span className="font-medium">{formatCurrency(vehicle.security_deposit)}</span>
                </li>
              )}
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckIcon className="size-4 text-brand" />
                Unlimited mileage
              </li>
            </ul>

            {profile ? (
              <Link href="/dashboard/documents" className={cn(buttonVariants(), 'h-11 w-full')}>
                Check my documents
              </Link>
            ) : (
              <div className="space-y-3">
                <Link href="/register" className={cn(buttonVariants(), 'h-11 w-full')}>
                  Create account to rent
                </Link>
                <p className="text-center text-xs text-muted-foreground">
                  Already a customer?{' '}
                  <Link href={`/login?redirectTo=/vehicles/${vehicle.id}`} className="text-brand hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              To rent, create an account and upload your driver&apos;s license and proof of address.
              Our team reviews them and gets in touch to arrange the rental.
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16 space-y-6 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            More {vehicle.vehicle_categories?.label ?? 'vehicles'}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <VehicleCard key={item.id} vehicle={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function VehicleHeading({
  vehicle,
}: {
  vehicle: { year: number; make: string; model: string; vehicle_categories: { label: string } | null }
}) {
  return (
    <>
      {vehicle.vehicle_categories && (
        <p className="eyebrow text-brand">{vehicle.vehicle_categories.label}</p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="block text-base font-normal text-muted-foreground">{vehicle.year}</span>
        {vehicle.make} {vehicle.model}
      </h1>
    </>
  )
}

function Price({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-semibold tracking-tight', highlight ? 'text-3xl text-brand' : 'text-2xl')}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}
