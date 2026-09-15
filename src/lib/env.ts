/**
 * Variaveis de ambiente publicas.
 *
 * Sao lidas literalmente (e nao via process.env[nome]) porque o Next so
 * substitui NEXT_PUBLIC_* no bundle do browser quando o acesso e estatico.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export function assertSupabaseEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase nao configurado. Copie .env.example para .env.local e preencha ' +
        'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }
}
