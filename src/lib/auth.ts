import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { isPreviewMode } from '@/lib/preview'
import { fixtureAdmin } from '@/lib/preview-fixtures'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types/database'

/**
 * Usuario autenticado do request atual, ou null.
 * `cache` evita repetir a chamada quando varios componentes da mesma pagina
 * perguntam quem esta logado.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (isPreviewMode()) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  // No preview todo mundo navega como admin, para que todas as telas do painel
  // possam ser vistas sem banco.
  if (isPreviewMode()) return fixtureAdmin

  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  return data ?? null
})

/** Exige sessao valida. Redireciona para o login se nao houver. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  return profile
}

/**
 * Exige papel de admin. Um cliente que tentar abrir uma rota de admin cai na
 * propria area em vez de ver um erro.
 *
 * Isto e a segunda linha de defesa: a primeira e a RLS, que ja impediria a
 * leitura dos dados mesmo se esta checagem falhasse.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== 'admin') redirect('/dashboard/account')
  return profile
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}
