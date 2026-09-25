import 'server-only'

import { cache } from 'react'

import { isPreviewMode } from '@/lib/preview'
import {
  fixtureCategories,
  fixtureVehicleDocuments,
  fixtureVehicles,
} from '@/lib/preview-fixtures'
import { createClient } from '@/lib/supabase/server'
import type {
  Vehicle,
  VehicleCategory,
  VehicleDocument,
  VehiclePhoto,
  VehicleStatus,
} from '@/lib/types/database'
import type { VehicleFilters } from '@/lib/validation/vehicle'

/**
 * Colunas visiveis na vitrine. Precisa bater exatamente com o
 * `grant select (...) on public.vehicles to anon` da migration de RLS:
 * placa e chassi ficam de fora, e um `select *` como anonimo falharia.
 */
export const PUBLIC_VEHICLE_COLUMNS =
  'id, make, model, year, category_slug, transmission, fuel, seats, doors, ' +
  'color, mileage, weekly_rate, monthly_rate, security_deposit, status, ' +
  'description, featured, created_at, updated_at'

const PHOTO_COLUMNS = 'id, vehicle_id, storage_path, alt_text, sort_order, is_cover, created_at'

const PUBLIC_VEHICLE_SELECT =
  `${PUBLIC_VEHICLE_COLUMNS}, vehicle_photos(${PHOTO_COLUMNS}), vehicle_categories(slug, label)`

/**
 * Sem sistema de reserva nesta fase, "disponivel" e o unico estado que faz
 * sentido anunciar. Se o cliente quiser mostrar tambem os alugados (com selo),
 * basta acrescentar 'rented' aqui.
 */
const PUBLIC_FEED_STATUSES: VehicleStatus[] = ['available']

export type PublicVehicle = Omit<Vehicle, 'plate' | 'vin'> & {
  vehicle_photos: VehiclePhoto[]
  vehicle_categories: Pick<VehicleCategory, 'slug' | 'label'> | null
}

export type AdminVehicle = Vehicle & {
  vehicle_photos: VehiclePhoto[]
  vehicle_categories: Pick<VehicleCategory, 'slug' | 'label'> | null
}

export type AdminVehicleDetail = AdminVehicle & {
  vehicle_documents: VehicleDocument[]
}

/** Feed publico, com filtros da querystring ja validados. */
export async function listPublicVehicles(
  filters: Partial<VehicleFilters> = {},
): Promise<PublicVehicle[]> {
  if (isPreviewMode()) return previewPublicVehicles(filters)

  const supabase = await createClient()

  let query = supabase
    .from('vehicles')
    .select(PUBLIC_VEHICLE_SELECT)
    .in('status', PUBLIC_FEED_STATUSES)

  if (filters.category) query = query.eq('category_slug', filters.category)
  if (filters.transmission) query = query.eq('transmission', filters.transmission)
  // A faixa de preco do filtro sempre olha o valor semanal, que e o que aparece
  // como preco principal no card.
  if (filters.minPrice !== undefined) query = query.gte('weekly_rate', filters.minPrice)
  if (filters.maxPrice !== undefined) query = query.lte('weekly_rate', filters.maxPrice)
  if (filters.search) {
    const term = `%${filters.search.replace(/[,()]/g, ' ')}%`
    query = query.or(`make.ilike.${term},model.ilike.${term}`)
  }

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('weekly_rate', { ascending: true })
      break
    case 'price_desc':
      query = query.order('weekly_rate', { ascending: false })
      break
    default:
      query = query.order('featured', { ascending: false }).order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load vehicles: ${error.message}`)

  return (data ?? []) as unknown as PublicVehicle[]
}

export const getPublicVehicle = cache(async (id: string): Promise<PublicVehicle | null> => {
  if (isPreviewMode()) {
    return previewPublicVehicles({}).find((vehicle) => vehicle.id === id) ?? null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .select(PUBLIC_VEHICLE_SELECT)
    .eq('id', id)
    .in('status', PUBLIC_FEED_STATUSES)
    .maybeSingle()

  // id mal formado vira "nao encontrado", e nao erro 500.
  if (error?.code === '22P02') return null
  if (error) throw new Error(`Failed to load vehicle: ${error.message}`)
  return (data as unknown as PublicVehicle) ?? null
})

/**
 * Lista do painel: inclui arquivados, colunas internas e os documentos -- a
 * tabela mostra o vencimento da registration de cada carro.
 */
export async function listVehiclesForAdmin(): Promise<AdminVehicleDetail[]> {
  if (isPreviewMode()) {
    return [...fixtureVehicles]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((vehicle) => ({
        ...withPreviewRelations(vehicle),
        vehicle_documents: fixtureVehicleDocuments.filter((doc) => doc.vehicle_id === vehicle.id),
      }))
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .select(`*, vehicle_photos(${PHOTO_COLUMNS}), vehicle_categories(slug, label), vehicle_documents(*)`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load vehicles: ${error.message}`)
  return (data ?? []) as unknown as AdminVehicleDetail[]
}

export const getVehicleForAdmin = cache(async (id: string): Promise<AdminVehicleDetail | null> => {
  if (isPreviewMode()) {
    const vehicle = fixtureVehicles.find((item) => item.id === id)
    if (!vehicle) return null
    return {
      ...withPreviewRelations(vehicle),
      vehicle_documents: fixtureVehicleDocuments.filter((doc) => doc.vehicle_id === id),
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .select(
      `*, vehicle_photos(${PHOTO_COLUMNS}), vehicle_categories(slug, label), vehicle_documents(*)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error?.code === '22P02') return null
  if (error) throw new Error(`Failed to load vehicle: ${error.message}`)
  return (data as unknown as AdminVehicleDetail) ?? null
})

/**
 * Documento vigente de um tipo (hoje, a registration): o de vencimento mais
 * distante, que e o que vale quando o admin ja cadastrou a renovacao.
 */
export function currentDocument(
  documents: VehicleDocument[],
  typeSlug: string,
): VehicleDocument | null {
  return (
    documents
      .filter((doc) => doc.type_slug === typeSlug)
      .sort((a, b) => (b.expires_at ?? '').localeCompare(a.expires_at ?? ''))[0] ?? null
  )
}

/** Foto de capa, com fallback para a primeira da galeria. */
export function coverPhoto(vehicle: { vehicle_photos: VehiclePhoto[] }): VehiclePhoto | null {
  if (!vehicle.vehicle_photos?.length) return null
  const sorted = [...vehicle.vehicle_photos].sort((a, b) => a.sort_order - b.sort_order)
  return sorted.find((photo) => photo.is_cover) ?? sorted[0]
}

export function sortedPhotos(vehicle: { vehicle_photos: VehiclePhoto[] }): VehiclePhoto[] {
  return [...(vehicle.vehicle_photos ?? [])].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1
    return a.sort_order - b.sort_order
  })
}

// ------------------------------------------------------------ modo preview

function withPreviewRelations(vehicle: Vehicle): AdminVehicle {
  const category = fixtureCategories.find((item) => item.slug === vehicle.category_slug)
  return {
    ...vehicle,
    vehicle_photos: [],
    vehicle_categories: category ? { slug: category.slug, label: category.label } : null,
  }
}

/** Replica em memoria os filtros e a ordenacao da consulta real. */
function previewPublicVehicles(filters: Partial<VehicleFilters>): PublicVehicle[] {
  const search = filters.search?.toLowerCase()

  const vehicles = fixtureVehicles
    .filter((vehicle) => PUBLIC_FEED_STATUSES.includes(vehicle.status))
    .filter((vehicle) => !filters.category || vehicle.category_slug === filters.category)
    .filter((vehicle) => !filters.transmission || vehicle.transmission === filters.transmission)
    .filter((vehicle) => filters.minPrice === undefined || vehicle.weekly_rate >= filters.minPrice)
    .filter((vehicle) => filters.maxPrice === undefined || vehicle.weekly_rate <= filters.maxPrice)
    .filter(
      (vehicle) =>
        !search ||
        vehicle.make.toLowerCase().includes(search) ||
        vehicle.model.toLowerCase().includes(search),
    )

  vehicles.sort((a, b) => {
    if (filters.sort === 'price_asc') return a.weekly_rate - b.weekly_rate
    if (filters.sort === 'price_desc') return b.weekly_rate - a.weekly_rate
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return b.created_at.localeCompare(a.created_at)
  })

  return vehicles.map((vehicle) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { plate, vin, ...publicFields } = withPreviewRelations(vehicle)
    return publicFields
  })
}
