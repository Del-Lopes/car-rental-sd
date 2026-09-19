import 'server-only'

import { isPreviewMode } from '@/lib/preview'
import {
  fixtureAdmin,
  fixtureCustomerDocuments,
  fixtureCustomerSummaries,
  fixtureCustomers,
} from '@/lib/preview-fixtures'
import { createClient } from '@/lib/supabase/server'
import type {
  CustomerDocument,
  CustomerDocumentSummary,
  CustomerDocumentType,
  Profile,
} from '@/lib/types/database'

export type CustomerDetail = Profile & {
  customer_documents: CustomerDocument[]
}

/** Lista do admin, ja com o resumo da situacao documental de cada cliente. */
export async function listCustomers(search?: string): Promise<CustomerDocumentSummary[]> {
  if (isPreviewMode()) {
    const term = search?.toLowerCase()
    return fixtureCustomerSummaries().filter(
      (customer) =>
        !term ||
        [customer.full_name, customer.email, customer.phone].some((value) =>
          value?.toLowerCase().includes(term),
        ),
    )
  }

  const supabase = await createClient()

  let query = supabase
    .from('v_customer_document_summary')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) {
    const term = `%${search.replace(/[,()]/g, ' ')}%`
    query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load customers: ${error.message}`)
  return data ?? []
}

export async function getCustomer(profileId: string): Promise<CustomerDetail | null> {
  if (isPreviewMode()) {
    const customer = fixtureCustomers.find((item) => item.id === profileId)
    if (!customer) return null
    return {
      ...customer,
      customer_documents: fixtureCustomerDocuments.filter((doc) => doc.profile_id === profileId),
    }
  }

  const supabase = await createClient()

  // customer_documents aponta para profiles duas vezes (dono e revisor): sem
  // nomear a FK, o PostgREST recusa o embed como ambiguo.
  const { data, error } = await supabase
    .from('profiles')
    .select('*, customer_documents!customer_documents_profile_id_fkey(*)')
    .eq('id', profileId)
    .maybeSingle()

  // id mal formado vira "nao encontrado", e nao erro 500.
  if (error?.code === '22P02') return null
  if (error) throw new Error(`Failed to load customer: ${error.message}`)
  return (data as unknown as CustomerDetail) ?? null
}

/** Documentos do usuario logado (area do cliente). A RLS ja limita ao dono. */
export async function listMyDocuments(profileId: string): Promise<CustomerDocument[]> {
  if (isPreviewMode()) {
    // O admin do preview nao tem documentos; mostramos os de um cliente com um
    // envio recusado, que e o caso mais completo para a area do cliente.
    const ownerId = profileId === fixtureAdmin.id ? fixtureCustomers[2].id : profileId
    return fixtureCustomerDocuments.filter((doc) => doc.profile_id === ownerId)
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_documents')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load documents: ${error.message}`)
  return data ?? []
}

export type DocumentChecklistItem = {
  type: CustomerDocumentType
  document: CustomerDocument | null
}

/**
 * Casa os tipos exigidos com o que o cliente ja enviou, para montar a checklist
 * do "o que ainda falta". Quando ha mais de um envio do mesmo tipo, vale o mais
 * recente -- e assim que o reenvio depois de uma recusa se comporta.
 */
export function buildDocumentChecklist(
  types: CustomerDocumentType[],
  documents: CustomerDocument[],
): DocumentChecklistItem[] {
  return types
    .filter((type) => type.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((type) => ({
      type,
      document:
        documents
          .filter((document) => document.type_slug === type.slug)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
    }))
}
