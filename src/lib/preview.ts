import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env'

/**
 * Modo preview: ligado automaticamente quando o Supabase ainda nao esta
 * configurado. A camada de dados passa a servir os fixtures (espelho do
 * seed.sql) e as mutacoes respondem com um aviso em vez de gravar.
 *
 * Existe para que as telas possam ser construidas e mostradas ao cliente antes
 * do banco existir. Desliga sozinho assim que as variaveis de ambiente forem
 * preenchidas -- nao ha flag para esquecer ligada. O site exibe uma faixa
 * visivel enquanto estiver ativo, entao um deploy sem env nunca passa por real.
 */
export function isPreviewMode(): boolean {
  return !SUPABASE_URL || !SUPABASE_ANON_KEY
}

export const PREVIEW_WRITE_MESSAGE =
  'Preview mode: connect Supabase to save changes. Nothing was stored.'
