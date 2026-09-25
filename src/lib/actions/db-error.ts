/**
 * Traducao de erro do banco para mensagem de tela.
 *
 * Mensagem crua do Postgres ("new row violates row-level security policy for
 * table ...") nao ajuda quem esta usando o site e ainda conta como o banco e
 * organizado. Aqui o que da para explicar vira texto util; o resto vira uma
 * mensagem generica e fica registrado no log do servidor.
 */

const KNOWN: Array<[fragment: string, message: string]> = [
  ['vehicles_plate_key', 'Another vehicle already uses this plate'],
  ['vehicles_vin_key', 'Another vehicle already uses this VIN'],
  // Locacao criada entre a checagem e a exclusao: o banco barra pela chave estrangeira.
  [
    'rentals_vehicle_id_fkey',
    'This vehicle has rental history and cannot be deleted. Move it to reserve instead.',
  ],
  ['rentals_one_active_per_vehicle', 'This vehicle already has an active rental'],
  ['rentals_renter_check', 'Select a customer or type who is renting'],
  ['rentals_dates_check', 'The end date cannot be before the start date'],
  ['Signed agreements cannot', 'This agreement is signed and can no longer be changed'],
  ['Published terms cannot', 'Published terms cannot be changed. Publish a new version instead.'],
  ['Rental not found', 'This rental no longer exists. Reload the page.'],
  ['violates row-level security', 'You do not have permission to perform this action'],
  ['permission denied', 'You do not have permission to perform this action'],
  ['duplicate key value', 'This record already exists'],
]

/** Texto tecnico que nunca deve chegar ao usuario. */
const LEAKY = [
  'relation "',
  'column "',
  'violates',
  'permission denied',
  'syntax error',
  'function ',
  'constraint',
  'JWT',
  'PGRST',
]

export function translateDbError(message: string | null | undefined): string {
  if (!message) return 'Something went wrong. Please try again.'

  for (const [fragment, friendly] of KNOWN) {
    if (message.includes(fragment)) return friendly
  }

  if (LEAKY.some((fragment) => message.includes(fragment))) {
    // O detalhe fica no log do servidor, onde so o dono do projeto ve.
    console.error('[db]', message)
    return 'Something went wrong. Please try again.'
  }

  // Sobra o que ja vem escrito para o usuario (mensagens do Supabase Auth,
  // por exemplo "Invalid login credentials").
  return message
}
