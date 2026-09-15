import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/page-header'
import { VehicleForm } from '@/components/dashboard/vehicle-form'
import { createVehicleAction } from '@/lib/actions/vehicles'
import { requireAdmin } from '@/lib/auth'
import { getVehicleCategories } from '@/lib/data/lookups'

export const metadata: Metadata = { title: 'Add vehicle' }

export default async function NewVehiclePage() {
  await requireAdmin()
  const categories = await getVehicleCategories()

  return (
    <>
      <PageHeader
        title="Add vehicle"
        description="Photos and registration come next, right after saving."
        back={{ href: '/dashboard/vehicles', label: 'Vehicles' }}
      />
      <VehicleForm action={createVehicleAction} categories={categories} submitLabel="Save and continue" />
    </>
  )
}
