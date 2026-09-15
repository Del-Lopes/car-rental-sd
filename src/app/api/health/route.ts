import { NextResponse } from 'next/server'

import { isAdmin } from '@/lib/auth'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Diagnostico de infraestrutura: responde se as migrations foram aplicadas e se
 * o app consegue falar com o banco. Serve para conferir um deploy novo sem
 * precisar de nenhuma tela pronta.
 *
 * Aberto em desenvolvimento; em producao exige admin, porque a resposta conta
 * quais tabelas existem.
 */
// Tabelas e views ficam separadas porque o client tipado do Supabase tem uma
// sobrecarga de `from()` para cada grupo -- uma lista unica nao resolve.
const TABLE_CHECKS = [
  'vehicles',
  'vehicle_photos',
  'vehicle_documents',
  'customer_documents',
  'profiles',
  'vehicle_categories',
  'vehicle_document_types',
  'customer_document_types',
] as const

const VIEW_CHECKS = [
  'v_expiring_vehicle_documents',
  'v_admin_dashboard_stats',
  'v_customer_document_summary',
] as const

export async function GET() {
  if (process.env.NODE_ENV === 'production' && !(await isAdmin())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Supabase env vars missing. Copy .env.example to .env.local.',
      },
      { status: 503 },
    )
  }

  const supabase = await createClient()
  const results: Record<string, string> = {}

  for (const relation of TABLE_CHECKS) {
    const { error } = await supabase.from(relation).select('*', { count: 'exact', head: true })
    results[relation] = error ? `error: ${error.message}` : 'ok'
  }

  for (const relation of VIEW_CHECKS) {
    const { error } = await supabase.from(relation).select('*', { count: 'exact', head: true })
    results[relation] = error ? `error: ${error.message}` : 'ok'
  }

  const ok = Object.values(results).every((value) => value === 'ok')

  return NextResponse.json({ ok, database: results }, { status: ok ? 200 : 503 })
}
