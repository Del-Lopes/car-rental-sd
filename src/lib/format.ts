/**
 * Formatacao do produto: EN-US, USD, datas mm/dd/yyyy.
 * Centralizado aqui porque, se um dia entrar um segundo mercado, e este o
 * unico arquivo que precisa virar locale-aware.
 */

const LOCALE = 'en-US'

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat(LOCALE)

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return currencyFormatter.format(value)
}

/**
 * Precos da locadora. Nao existe diaria: o semanal e o preco principal do card
 * e o mensal aparece como alternativa.
 */
export function formatWeeklyRate(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return `${currencyFormatter.format(value)}/week`
}

export function formatMonthlyRate(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return `${currencyFormatter.format(value)}/month`
}

/** Caucao. Quando nao ha valor definido, nao inventamos zero. */
export function formatDeposit(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return currencyFormatter.format(value)
}

export function formatMileage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return `${numberFormatter.format(value)} mi`
}

/**
 * Colunas `date` do Postgres chegam como "YYYY-MM-DD". Passar isso direto para
 * `new Date()` interpreta como UTC e, em fuso negativo, exibe o dia anterior --
 * exatamente o tipo de erro que estragaria um controle de vencimentos.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '--'
  const date = value.length === 10 ? parseDateOnly(value) : new Date(value)
  return new Intl.DateTimeFormat(LOCALE, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat(LOCALE, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

/**
 * A registration vence por mes/ano, entao e assim que ela e exibida: "09/2026".
 * No banco a mesma informacao fica como o ultimo dia daquele mes.
 */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return '--'
  const date = value.length === 10 ? parseDateOnly(value) : new Date(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

/**
 * Converte o mes/ano informado no formulario para a data guardada no banco:
 * o ultimo dia do mes, para que a contagem de dias do dashboard fique correta.
 * `Date.UTC(year, month, 0)` cai no dia 0 do mes seguinte, que e o ultimo dia
 * do mes desejado -- inclusive em fevereiro de ano bissexto.
 */
export function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

/** "in 8 days" / "today" / "12 days ago" -- usado no dashboard de vencimentos. */
export function formatDaysToExpire(days: number): string {
  if (days === 0) return 'today'
  if (days > 0) return `in ${days} ${days === 1 ? 'day' : 'days'}`
  const overdue = Math.abs(days)
  return `${overdue} ${overdue === 1 ? 'day' : 'days'} ago`
}

export function vehicleTitle(vehicle: { year: number; make: string; model: string }): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`
}
