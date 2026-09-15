import 'server-only'

import { cache } from 'react'

import { isPreviewMode } from '@/lib/preview'
import {
  fixtureCategories,
  fixtureCustomerDocumentTypes,
  fixtureVehicleDocumentTypes,
} from '@/lib/preview-fixtures'
import { createClient } from '@/lib/supabase/server'
import type {
  CustomerDocumentType,
  VehicleCategory,
  VehicleDocumentType,
} from '@/lib/types/database'

/**
 * Listas de dominio (categorias e tipos de documento).
 *
 * Vivem no banco justamente porque ainda dependem da confirmacao do cliente:
 * quando ele responder, e um INSERT/UPDATE -- nao um deploy.
 */

export const getVehicleCategories = cache(async (): Promise<VehicleCategory[]> => {
  if (isPreviewMode()) return fixtureCategories
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicle_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`Failed to load categories: ${error.message}`)
  return data ?? []
})

export const getVehicleDocumentTypes = cache(async (): Promise<VehicleDocumentType[]> => {
  if (isPreviewMode()) return fixtureVehicleDocumentTypes
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicle_document_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`Failed to load document types: ${error.message}`)
  return data ?? []
})

export const getCustomerDocumentTypes = cache(async (): Promise<CustomerDocumentType[]> => {
  if (isPreviewMode()) return fixtureCustomerDocumentTypes
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customer_document_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(`Failed to load document types: ${error.message}`)
  return data ?? []
})
