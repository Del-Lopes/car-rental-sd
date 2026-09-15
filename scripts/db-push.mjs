/**
 * Aplica as migrations de supabase/migrations no banco apontado por
 * SUPABASE_DB_URL (.env.local), sem precisar de `supabase login`.
 *
 * O CLI e chamado direto pelo node, sem shell: a connection string carrega a
 * senha do banco, e um shell interpretaria caracteres como & ou % dentro dela.
 * Pelo mesmo motivo a URL nunca e impressa.
 *
 * Uso: npm run db:push:url            (aplica)
 *      npm run db:push:url -- --dry-run  (so lista o que seria aplicado)
 */

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('SUPABASE_DB_URL vazia. Cole a connection string (Session pooler) no .env.local.')
  process.exit(1)
}

if (dbUrl.includes('[YOUR-PASSWORD]')) {
  console.error('A connection string ainda tem [YOUR-PASSWORD]. Troque pela senha do banco.')
  process.exit(1)
}

const cli = createRequire(import.meta.url).resolve('supabase/dist/supabase.js')
const extraArgs = process.argv.slice(2)

try {
  execFileSync(process.execPath, [cli, 'db', 'push', '--db-url', dbUrl, ...extraArgs], {
    stdio: 'inherit',
  })
} catch (error) {
  process.exit(typeof error.status === 'number' ? error.status : 1)
}
