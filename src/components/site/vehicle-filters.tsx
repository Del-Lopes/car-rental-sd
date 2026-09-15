'use client'

import Form from 'next/form'
import Link from 'next/link'
import { SearchIcon, XIcon } from 'lucide-react'
import type { ChangeEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { VehicleCategory } from '@/lib/types/database'
import type { VehicleFilters as Filters } from '@/lib/validation/vehicle'
import { cn } from '@/lib/utils'

const MAX_PRICE_OPTIONS = [500, 800, 1200, 2000]

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground'

/**
 * Filtros do feed. E um formulario GET de verdade: funciona sem JavaScript, o
 * resultado fica na URL (da para compartilhar o link filtrado) e o servidor
 * renderiza a lista. Com JS, `next/form` troca o reload por navegacao suave e
 * os selects aplicam sozinhos ao mudar.
 */
export function VehicleFilters({
  categories,
  filters,
}: {
  categories: VehicleCategory[]
  filters: Partial<Filters>
}) {
  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.transmission || filters.maxPrice ||
      (filters.sort && filters.sort !== 'newest'),
  )

  const submitOnChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <Form action="/" scroll={false} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search make or model</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="search"
            defaultValue={filters.search ?? ''}
            placeholder="Search make or model"
            className="h-10 pl-9"
          />
        </label>

        <label>
          <span className="sr-only">Category</span>
          <select name="category" defaultValue={filters.category ?? ''} onChange={submitOnChange} className={selectClass}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Transmission</span>
          <select
            name="transmission"
            defaultValue={filters.transmission ?? ''}
            onChange={submitOnChange}
            className={selectClass}
          >
            <option value="">Any transmission</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Maximum weekly price</span>
          <select
            name="maxPrice"
            defaultValue={filters.maxPrice ? String(filters.maxPrice) : ''}
            onChange={submitOnChange}
            className={selectClass}
          >
            <option value="">Any weekly price</option>
            {MAX_PRICE_OPTIONS.map((price) => (
              <option key={price} value={price}>
                Up to ${price.toLocaleString('en-US')}/week
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Sort by</span>
          <select name="sort" defaultValue={filters.sort ?? 'newest'} onChange={submitOnChange} className={selectClass}>
            <option value="newest">Featured first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </div>

      <div className={cn('flex items-center gap-3', !hasActiveFilters && 'sm:hidden')}>
        {/* Sem JS os selects nao aplicam sozinhos; este botao cobre esse caso e a busca. */}
        <Button type="submit" variant="secondary" className="h-9 px-3 sm:hidden">
          Apply filters
        </Button>
        {hasActiveFilters && (
          <Link
            href="/#fleet"
            scroll={false}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
            Clear filters
          </Link>
        )}
      </div>
    </Form>
  )
}
