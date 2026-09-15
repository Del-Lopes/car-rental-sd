import { createBrowserClient } from '@supabase/ssr'

import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from '@/lib/env'
import type { Database } from '@/lib/types/database'

/** Client do Supabase para uso em Client Components. */
export function createClient() {
  assertSupabaseEnv()
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
