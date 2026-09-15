import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'
import { SearchIcon, UsersRoundIcon } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { ToneBadge } from '@/components/dashboard/status-badges'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { listCustomers } from '@/lib/data/customers'
import { formatDate } from '@/lib/format'
import type { CustomerDocumentSummary } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin()
  const { q } = await searchParams
  const search = q?.trim().slice(0, 80) || undefined

  // Quem tem documento esperando revisao sobe para o topo: e o trabalho do dia.
  const customers = (await listCustomers(search)).sort(
    (a, b) => b.documents_pending - a.documents_pending || b.created_at.localeCompare(a.created_at),
  )

  return (
    <>
      <PageHeader title="Customers" description="Registered renters and the state of their documents." />

      <Form action="/dashboard/customers" className="mb-4 max-w-sm">
        <label className="relative block">
          <span className="sr-only">Search customers</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" name="q" defaultValue={search} placeholder="Search name, email or phone" className="h-9 pl-9" />
        </label>
      </Form>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <UsersRoundIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">{search ? 'No customers match this search' : 'No customers yet'}</p>
          <p className="text-sm text-muted-foreground">
            {search ? 'Try a different name, email or phone.' : 'Customers appear here as soon as they create an account.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="pr-4">Documents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.profile_id}>
                  <TableCell className="pl-4">
                    <Link href={`/dashboard/customers/${customer.profile_id}`} className="block font-medium hover:text-brand">
                      {customer.full_name ?? 'Unnamed customer'}
                    </Link>
                    <span className="text-xs text-muted-foreground">{customer.email}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{customer.phone ?? '—'}</TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{formatDate(customer.created_at)}</TableCell>
                  <TableCell className="pr-4">
                    <DocumentsSummary customer={customer} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

function DocumentsSummary({ customer }: { customer: CustomerDocumentSummary }) {
  if (customer.documents_total === 0) return <ToneBadge tone="neutral">Nothing uploaded</ToneBadge>

  return (
    <span className="flex flex-wrap gap-1.5">
      {customer.documents_pending > 0 && <ToneBadge tone="caution">{customer.documents_pending} to review</ToneBadge>}
      {customer.documents_rejected > 0 && <ToneBadge tone="danger">{customer.documents_rejected} rejected</ToneBadge>}
      {customer.required_missing === 0 ? (
        <ToneBadge tone="success">Approved</ToneBadge>
      ) : (
        customer.documents_pending === 0 && <ToneBadge tone="neutral">{customer.required_missing} missing</ToneBadge>
      )}
    </span>
  )
}
