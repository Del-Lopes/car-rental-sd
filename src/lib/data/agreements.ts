import 'server-only'

import { cache } from 'react'

import { isPreviewMode } from '@/lib/preview'
import { fixtureAgreements, fixtureTerms } from '@/lib/preview-fixtures'
import { createClient } from '@/lib/supabase/server'
import type { RentalAgreementView, TermsVersion } from '@/lib/types/database'

/** Versao vigente dos termos, ou null se o admin ainda nao publicou nenhuma. */
export async function getCurrentTerms(): Promise<TermsVersion | null> {
  if (isPreviewMode()) return fixtureTerms

  const supabase = await createClient()
  const { data, error } = await supabase.from('v_current_terms').select('*').maybeSingle()

  if (error) throw new Error(`Failed to load terms: ${error.message}`)
  return data ?? null
}

export async function getTermsVersion(id: string): Promise<TermsVersion | null> {
  if (isPreviewMode()) return id === fixtureTerms.id ? fixtureTerms : null

  const supabase = await createClient()
  const { data, error } = await supabase.from('terms_versions').select('*').eq('id', id).maybeSingle()

  if (error?.code === '22P02') return null
  if (error) throw new Error(`Failed to load terms: ${error.message}`)
  return data ?? null
}

export async function listTermsVersions(): Promise<TermsVersion[]> {
  if (isPreviewMode()) return [fixtureTerms]

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('terms_versions')
    .select('*')
    .order('version', { ascending: false })

  if (error) throw new Error(`Failed to load terms history: ${error.message}`)
  return data ?? []
}

/**
 * Contratos visiveis para quem esta logado: a RLS devolve todos para o admin e
 * so os proprios para o cliente -- a mesma consulta serve as duas telas.
 */
export const listAgreements = cache(async (): Promise<RentalAgreementView[]> => {
  if (isPreviewMode()) return fixtureAgreements()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_rental_agreements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load agreements: ${error.message}`)
  return data ?? []
})

export async function getAgreement(id: string): Promise<RentalAgreementView | null> {
  if (isPreviewMode()) return fixtureAgreements().find((agreement) => agreement.id === id) ?? null

  const supabase = await createClient()
  const { data, error } = await supabase.from('v_rental_agreements').select('*').eq('id', id).maybeSingle()

  if (error?.code === '22P02') return null
  if (error) throw new Error(`Failed to load agreement: ${error.message}`)
  return data ?? null
}

export async function getAgreementForRental(rentalId: string): Promise<RentalAgreementView | null> {
  if (isPreviewMode()) {
    return fixtureAgreements().find((agreement) => agreement.rental_id === rentalId) ?? null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_rental_agreements')
    .select('*')
    .eq('rental_id', rentalId)
    .maybeSingle()

  if (error?.code === '22P02') return null
  if (error) throw new Error(`Failed to load agreement: ${error.message}`)
  return data ?? null
}

/** Pendentes de locacoes ainda ativas -- o que realmente espera assinatura. */
export function pendingAgreements(agreements: RentalAgreementView[]): RentalAgreementView[] {
  return agreements.filter((agreement) => agreement.status === 'pending' && agreement.rental_status === 'active')
}
