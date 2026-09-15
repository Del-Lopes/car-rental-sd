import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_URL } from '@/lib/env'
import type { Database } from '@/lib/types/database'

/**
 * Client com service role: IGNORA toda a RLS.
 *
 * Usar somente em tarefas administrativas que nao tem um usuario por tras
 * (scripts de bootstrap, jobs, promover o primeiro admin). Nunca importar em
 * Client Component -- o `server-only` acima quebra o build se isso acontecer.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY nao configurada. Ela e secreta: mantenha fora do ' +
        'controle de versao e nunca prefixe com NEXT_PUBLIC_.',
    )
  }

  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
