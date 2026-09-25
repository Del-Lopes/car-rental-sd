import type { Metadata } from 'next'
import Link from 'next/link'
import { FileSignatureIcon } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { ToneBadge } from '@/components/dashboard/status-badges'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireProfile } from '@/lib/auth'
import { listAgreements } from '@/lib/data/agreements'
import { formatDate } from '@/lib/format'
import type { RentalAgreementView } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Agreements' }

function statusOf(agreement: RentalAgreementView) {
  if (agreement.status === 'signed') return { tone: 'success' as const, label: 'Signed' }
  if (agreement.rental_status !== 'active') return { tone: 'neutral' as const, label: 'Rental closed' }
  return { tone: 'caution' as const, label: 'Awaiting signature' }
}

export default async function AgreementsPage() {
  const profile = await requireProfile()
  const isAdmin = profile.role === 'admin'
  // RLS: admin recebe todos, cliente so os proprios. Pendentes primeiro.
  const agreements = (await listAgreements()).sort((a, b) => {
    const rank = (x: RentalAgreementView) => (x.status === 'pending' && x.rental_status === 'active' ? 0 : 1)
    return rank(a) - rank(b) || b.created_at.localeCompare(a.created_at)
  })

  return (
    <>
      <PageHeader
        title="Rental agreements"
        description={isAdmin ? 'Agreements generated for rentals to registered customers.' : 'Agreements for your rentals.'}
      />

      {agreements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <FileSignatureIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">No agreements yet</p>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'An agreement is created when you rent a vehicle to a registered customer.'
              : 'When Carental registers a rental for you, the agreement to sign appears here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Vehicle</TableHead>
                {isAdmin && <TableHead className="hidden sm:table-cell">Customer</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((agreement) => {
                const status = statusOf(agreement)
                const needsMySignature = !isAdmin && status.label === 'Awaiting signature'
                return (
                  <TableRow key={agreement.id}>
                    <TableCell className="max-w-[45vw] pl-4 font-medium sm:max-w-none">
                      <span className="block truncate">{agreement.vehicle_label}</span>
                      {/* No celular o nome do cliente vem aqui, sem coluna propria. */}
                      {isAdmin && (
                        <span className="block truncate text-xs font-normal text-muted-foreground sm:hidden">
                          {agreement.customer_name ?? agreement.customer_email ?? '—'}
                        </span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="hidden sm:table-cell">
                        {agreement.customer_name ?? agreement.customer_email ?? '—'}
                      </TableCell>
                    )}
                    <TableCell>
                      <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {formatDate(agreement.signed_at ?? agreement.created_at)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Link
                        href={`/dashboard/agreements/${agreement.id}`}
                        className={cn(buttonVariants({ variant: needsMySignature ? 'default' : 'outline' }), 'h-8 px-3')}
                      >
                        {needsMySignature ? 'Review and sign' : 'View'}
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
