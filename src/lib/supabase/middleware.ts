import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env'
import type { Database } from '@/lib/types/database'

/** Rotas que so fazem sentido para quem NAO esta logado. */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

/** Prefixo das rotas que exigem sessao. */
const PROTECTED_PREFIX = '/dashboard'

/**
 * Renova o token do Supabase a cada request e faz o controle de acesso grosso
 * (logado / nao logado). A checagem de papel (admin x customer) fica nos
 * layouts do dashboard, para nao pagar uma consulta ao banco em toda rota --
 * e a RLS garante o resto mesmo se alguem furar a UI.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // Nao inserir logica entre createServerClient e getUser: e o getUser que
  // revalida o token e dispara a gravacao dos cookies acima.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`)
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return copyCookies(supabaseResponse, NextResponse.redirect(url))
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = PROTECTED_PREFIX
    url.search = ''
    return copyCookies(supabaseResponse, NextResponse.redirect(url))
  }

  return supabaseResponse
}

/**
 * Ao redirecionar precisamos levar junto os cookies de sessao que o Supabase
 * acabou de gravar, senao o usuario perde o refresh do token no caminho.
 */
function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie)
  }
  return to
}
