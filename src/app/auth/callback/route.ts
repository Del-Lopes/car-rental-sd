import { NextResponse } from 'next/server'

import { safeRedirectPath } from '@/lib/redirect'
import { createClient } from '@/lib/supabase/server'

/**
 * Troca o code do link de e-mail (confirmacao de cadastro e reset de senha)
 * por uma sessao. E o unico ponto do app que grava sessao a partir de um link
 * externo, entao o destino precisa ser validado.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

