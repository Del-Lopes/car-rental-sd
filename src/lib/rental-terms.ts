/**
 * Condicoes de locacao definidas pelo cliente (16/09/2026).
 *
 * Fonte unica: home, pagina do veiculo e rodape leem daqui. Mudou uma regra,
 * muda so neste arquivo.
 *
 * Observacoes sobre o texto original:
 * - O original em portugues dizia "San Diego State"; o ingles, "San Diego
 *   County". San Diego e condado -- usamos County.
 * - O original trazia um asterisco em "NOT included)*" sem nota de rodape
 *   correspondente; foi omitido ate o cliente enviar a nota.
 */

/** Caucao padrao informado pelo cliente. Tambem pre-preenche o cadastro de veiculo. */
export const STANDARD_SECURITY_DEPOSIT = 150

/** Area em que o carro pode circular. */
export const SERVICE_AREA = 'San Diego County'

export type RentalTerm = {
  /** Identifica termos que a pagina do veiculo ja mostra no quadro de preco. */
  id?: 'deposit' | 'mileage'
  title: string
  detail?: string
  /** Destaque visual para o que o locatario nao pode deixar de ler. */
  emphasis?: boolean
}

/** O que vem junto com a locacao -- argumento de venda. */
export const INCLUDED_TERMS: RentalTerm[] = [
  {
    title: 'Preventive maintenance included',
  },
  {
    title: '24/7 roadside assistance',
    detail: 'Towing up to 15 miles.',
  },
  {
    id: 'mileage',
    title: `Unlimited mileage within ${SERVICE_AREA}`,
  },
]

/** Requisitos e restricoes -- o que precisa ficar claro antes de alugar. */
export const RESTRICTION_TERMS: RentalTerm[] = [
  {
    title: "Valid driver's license required",
    detail: 'A US license is preferred.',
  },
  {
    id: 'deposit',
    title: `$${STANDARD_SECURITY_DEPOSIT} security deposit`,
    detail: 'Refunded when the vehicle is returned.',
  },
  {
    title: 'Damage and cleaning',
    detail: 'The deposit is withheld for vehicle damage. A $50 car wash fee applies.',
  },
  {
    title: '1 week advance notice for returns',
    detail: 'Monthly plan only.',
  },
  {
    title: `Valid throughout ${SERVICE_AREA} only`,
    detail: 'Trips or travel outside the area are not included.',
  },
  {
    // Texto fiel ao do cliente: detalhar cobertura de seguro e decisao dele.
    title: 'Insurance: third-party liability only',
    emphasis: true,
  },
]
