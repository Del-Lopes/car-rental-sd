import Link from 'next/link'
import { FuelIcon, GaugeIcon, UsersIcon } from 'lucide-react'

import { VehicleImage } from '@/components/site/vehicle-image'
import { FUEL_LABELS, TRANSMISSION_LABELS } from '@/lib/constants'
import { coverPhoto, type PublicVehicle } from '@/lib/data/vehicles'
import { formatCurrency, vehicleTitle } from '@/lib/format'

export function VehicleCard({ vehicle, priority = false }: { vehicle: PublicVehicle; priority?: boolean }) {
  const title = vehicleTitle(vehicle)

  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-black/20 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative">
        <VehicleImage photo={coverPhoto(vehicle)} alt={title} priority={priority} />
        {vehicle.vehicle_categories && (
          <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[0.7rem] font-medium backdrop-blur">
            {vehicle.vehicle_categories.label}
          </span>
        )}
        {vehicle.featured && (
          <span className="gold-plate absolute right-3 top-3 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-neutral-950">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{vehicle.year}</p>
          <h3 className="text-base font-semibold leading-tight group-hover:text-brand">
            {vehicle.make} {vehicle.model}
          </h3>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <GaugeIcon className="size-3.5" />
            {TRANSMISSION_LABELS[vehicle.transmission]}
          </li>
          {vehicle.seats && (
            <li className="flex items-center gap-1.5">
              <UsersIcon className="size-3.5" />
              {vehicle.seats} seats
            </li>
          )}
          {vehicle.fuel && (
            <li className="flex items-center gap-1.5">
              <FuelIcon className="size-3.5" />
              {FUEL_LABELS[vehicle.fuel]}
            </li>
          )}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-lg font-semibold leading-none">
              {formatCurrency(vehicle.weekly_rate)}
              <span className="text-xs font-normal text-muted-foreground"> /week</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(vehicle.monthly_rate)} /month
            </p>
          </div>
          <span className="text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
            View details →
          </span>
        </div>
      </div>
    </Link>
  )
}
