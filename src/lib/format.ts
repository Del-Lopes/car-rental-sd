/**
 * Formatacao do produto: EN-US, USD, datas mm/dd/yyyy.
 * Centralizado aqui porque, se um dia entrar um segundo mercado, e este o
 * unico arquivo que precisa virar locale-aware.
 */

const LOCALE = 'en-US'

/**
 * A operacao e em San Diego. "Hoje" e os horarios exibidos seguem Los Angeles,
 * onde quer que rode o servidor (a Vercel roda em UTC) ou esteja o admin.
 */
export const APP_TIME_ZONE = 'America/Los_Angeles'

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data de hoje em San Diego, como "YYYY-MM-DD". */
export function todayIso(): string {
  return isoDateFormatter.format(new Date())
}

/** Soma dias ou meses a uma data "YYYY-MM-DD" sem passar por UTC. */
export function shiftDateIso(value: string, { days = 0, months = 0 }: { days?: number; months?: number }): string {
  const date = parseDateOnly(value)
  if (months) {
    // 31/01 + 1 mes vira 28/02, e nao 03/03: o dia e limitado ao fim do mes.
    const day = date.getDate()
    date.setDate(1)
    date.setMonth(date.getMonth() + months)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    date.setDate(Math.min(day, lastDay))
  }
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

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
  // Data pura nao tem fuso; timestamp e convertido para o horario de San Diego.
  const dateOnly = value.length === 10
  return new Intl.DateTimeFormat(LOCALE, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: dateOnly ? undefined : APP_TIME_ZONE,
  }).format(dateOnly ? parseDateOnly(value) : new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat(LOCALE, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
    timeZoneName: 'short',
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
