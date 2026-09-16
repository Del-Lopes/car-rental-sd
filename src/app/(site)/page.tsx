import Link from 'next/link'
import { CarFrontIcon, FileCheck2Icon, KeyRoundIcon, SearchXIcon } from 'lucide-react'

import { RentalTerms } from '@/components/site/rental-terms'
import { VehicleCard } from '@/components/site/vehicle-card'
import { VehicleFilters } from '@/components/site/vehicle-filters'
import { buttonVariants } from '@/components/ui/button'
import { listPublicVehicles } from '@/lib/data/vehicles'
import { getVehicleCategories } from '@/lib/data/lookups'
import { formatCurrency } from '@/lib/format'
import { SERVICE_AREA } from '@/lib/rental-terms'
import { SITE_CONFIG } from '@/lib/site'
import { cn } from '@/lib/utils'
import { vehicleFilterSchema, type VehicleFilters as Filters } from '@/lib/validation/vehicle'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Querystring invalida (ex.: ?transmission=foo) nao deve derrubar a home:
 * descarta os campos vazios e, se ainda assim nao validar, mostra tudo.
 */
function parseFilters(raw: Record<string, string | string[] | undefined>): Partial<Filters> {
  const entries = Object.entries(raw)
    .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value] as const)
    .filter(([, value]) => value !== undefined && value !== '')

  const parsed = vehicleFilterSchema.safeParse(Object.fromEntries(entries))
  return parsed.success ? parsed.data : {}
}

const STEPS = [
  {
    icon: CarFrontIcon,
    title: 'Pick your car',
    body: 'Browse the fleet and compare weekly and monthly rates. Every price is shown up front, deposit included.',
  },
  {
    icon: FileCheck2Icon,
    title: 'Create your account',
    body: "Sign up and upload your driver's license and proof of address. It only takes a few minutes.",
  },
  {
    icon: KeyRoundIcon,
    title: 'Get on the road',
    body: 'Our team reviews your documents and reaches out to arrange your rental and pick-up.',
  },
]

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams)

  const [vehicles, categories, allVehicles] = await Promise.all([
    listPublicVehicles(filters),
    getVehicleCategories(),
    listPublicVehicles(),
  ])

  const lowestWeekly = allVehicles.length
    ? Math.min(...allVehicles.map((vehicle) => vehicle.weekly_rate))
    : null

  return (
    <>
      <JsonLd />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--brand)_18%,transparent),transparent_60%)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="eyebrow text-brand">{SITE_CONFIG.tagline}</p>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Weekly and monthly rentals, <span className="text-gold">without the premium price.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Well-kept sedans, SUVs, wagons and minivans with clear pricing — no daily
              surprises and unlimited mileage across {SERVICE_AREA}.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="#fleet" className={cn(buttonVariants(), 'h-11 px-5 text-sm')}>
                Browse the fleet
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-5 text-sm')}
              >
                Create account
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
            <HeroStat label="Starting at" value={lowestWeekly !== null ? `${formatCurrency(lowestWeekly)}` : '—'} hint="per week" />
            <HeroStat label="Vehicles" value={String(allVehicles.length)} hint="available now" />
            <HeroStat label="Mileage" value="Unlimited" hint={`within ${SERVICE_AREA}`} />
            <HeroStat label="Plans" value="Flexible" hint="weekly or monthly" />
          </dl>
        </div>
      </section>

      {/* ----------------------------------------------------------- fleet */}
      <section id="fleet" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow text-brand">The fleet</p>
              <h2 className="text-3xl font-semibold tracking-tight">Available vehicles</h2>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
            </p>
          </div>

          <VehicleFilters categories={categories} filters={filters} />

          {vehicles.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle, index) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} priority={index < 3} />
              ))}
            </div>
          ) : allVehicles.length === 0 ? (
            // Frota vazia (ex.: logo apos o lancamento) e diferente de filtro sem
            // resultado: aqui nao ha o que "limpar", entao o convite e se cadastrar.
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
              <CarFrontIcon className="size-8 text-brand" strokeWidth={1.5} />
              <div className="space-y-1">
                <p className="font-medium">New vehicles are on the way</p>
                <p className="text-sm text-muted-foreground">
                  Create your account now and get your documents approved before the fleet goes live.
                </p>
              </div>
              <Link href="/register" className={cn(buttonVariants(), 'mt-2 h-9 px-4')}>
                Create account
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
              <SearchXIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
              <div className="space-y-1">
                <p className="font-medium">No vehicles match these filters</p>
                <p className="text-sm text-muted-foreground">
                  Try another category or a higher price range.
                </p>
              </div>
              <Link href="/#fleet" scroll={false} className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 h-9 px-4')}>
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-border/60 bg-card/40">
        <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl space-y-2">
            <p className="eyebrow text-brand">How it works</p>
            <h2 className="text-3xl font-semibold tracking-tight">Three steps to your next car</h2>
          </div>

          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative space-y-3 rounded-xl border border-border bg-background p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <step.icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="font-display text-xs text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------- rental terms */}
      <section id="rental-terms" className="scroll-mt-20 border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl space-y-2">
            <p className="eyebrow text-brand">Rental terms</p>
            <h2 className="text-3xl font-semibold tracking-tight">Know before you rent</h2>
            <p className="text-muted-foreground">
              Simple rules, stated up front. Please read them before creating your account.
            </p>
          </div>

          <RentalTerms />

          <p className="text-sm text-muted-foreground">
            This is a summary. Every rental is signed under our{' '}
            <Link href="/terms" className="font-medium text-brand hover:underline">
              full rental terms
            </Link>
            .
          </p>

          {/* Chamada depois das regras: quem clica ja leu as condicoes. */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand/30 bg-brand/5 p-6">
            <div className="space-y-1">
              <p className="font-semibold">Ready when you are</p>
              <p className="text-sm text-muted-foreground">
                Create your account now so your documents are reviewed before you need the car.
              </p>
            </div>
            <Link href="/register" className={cn(buttonVariants(), 'h-10 px-5')}>
              Create account
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="space-y-1 bg-card p-5 sm:p-6">
      <dt className="eyebrow text-[0.6rem] text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}

/** Dados estruturados para buscadores, no mesmo formato da referencia. */
function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CarRental',
    name: SITE_CONFIG.name,
    slogan: SITE_CONFIG.tagline,
    description: SITE_CONFIG.description,
    image: '/Logo_carental.jpeg',
    priceRange: '$$',
  }

  return (
    <script
      type="application/ld+json"
      // Conteudo 100% estatico e controlado por nos; nao ha entrada de usuario.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
