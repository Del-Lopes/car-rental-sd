/**
 * Cria (ou promove) o usuario administrador.
 *
 * Existe porque nao ha -- e nao deve haver -- nenhum caminho pela interface que
 * transforme alguem em admin: o trigger do banco cria todo mundo como
 * 'customer' e o trigger profiles_lock_role impede a auto-promocao.
 *
 * Uso (recomendado -- a senha nao fica no historico do terminal):
 *   ADMIN_PASSWORD=... npm run create-admin -- admin@carental.com "Nome do Admin"
 *
 * Uso alternativo, com a senha como argumento:
 *   npm run create-admin -- admin@carental.com "SenhaForte123" "Nome do Admin"
 */

import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const passwordFromEnv = process.env.ADMIN_PASSWORD

// Com ADMIN_PASSWORD os argumentos sao <email> [nome]; sem ela, <email> <senha> [nome].
const [email, password, fullName] = passwordFromEnv
  ? [args[0], passwordFromEnv, args[1]]
  : [args[0], args[1], args[2]]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !password) {
  console.error('Uso: ADMIN_PASSWORD=... npm run create-admin -- <email> [nome]')
  process.exit(1)
}

// Mesma regra do cadastro pelo site (validation/auth.ts).
if (password.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.')
  process.exit(1)
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY. ' +
      'Confira o .env.local.',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  let userId: string | undefined

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName ?? 'Administrator' },
  })

  if (created?.user) {
    userId = created.user.id
    console.log(`Usuario criado: ${email}`)
  } else if (createError?.message.includes('already been registered')) {
    // Ja existe: seguimos so para promover.
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    userId = list?.users.find((user) => user.email === email)?.id
    console.log(`Usuario ja existia: ${email}`)
  } else {
    console.error(`Falha ao criar usuario: ${createError?.message}`)
    process.exit(1)
  }

  if (!userId) {
    console.error('Nao foi possivel determinar o id do usuario.')
    process.exit(1)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin', full_name: fullName ?? 'Administrator' })
    .eq('id', userId)

  if (profileError) {
    console.error(`Falha ao promover a admin: ${profileError.message}`)
    process.exit(1)
  }

  // Confere no banco em vez de confiar no update: foi assim que um trigger ja
  // chegou a reverter a promocao em silencio.
  const { data: saved } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (saved?.role !== 'admin') {
    console.error(`O update rodou, mas o papel salvo e "${saved?.role ?? 'nenhum'}". Nada foi promovido.`)
    process.exit(1)
  }

  console.log(`Pronto. ${email} agora e admin (confirmado no banco).`)
}

main()
