import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from '@/lib/env'
import type { Database } from '@/lib/types/database'

/**
 * Client do Supabase para Server Components, Route Handlers e Server Actions.
 * Sempre criar um por request -- nunca guardar em variavel de modulo, senao a
 * sessao de um usuario vaza para o request de outro.
 */
export async function createClient() {
  assertSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components nao podem escrever cookies. O refresh do token
          // acontece no middleware, entao aqui e seguro ignorar.
        }
      },
    },
  })
}
