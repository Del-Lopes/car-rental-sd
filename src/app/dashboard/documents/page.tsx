import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircleIcon, CheckCircle2Icon, Clock3Icon, FileSignatureIcon, FileTextIcon, Trash2Icon } from 'lucide-react'

import { ConfirmActionButton } from '@/components/dashboard/confirm-action-button'
import { PageHeader } from '@/components/dashboard/page-header'
import { DocumentStatusBadge, ToneBadge } from '@/components/dashboard/status-badges'
import { DocumentUploadForm } from '@/components/customer/document-upload-form'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteCustomerDocumentAction } from '@/lib/actions/documents'
import { requireProfile } from '@/lib/auth'
import { listAgreements, pendingAgreements } from '@/lib/data/agreements'
import { buildDocumentChecklist, listMyDocuments } from '@/lib/data/customers'
import { getCustomerDocumentTypes } from '@/lib/data/lookups'
import { formatDate, formatDateTime } from '@/lib/format'
import { isPreviewMode } from '@/lib/preview'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'My documents' }

export default async function MyDocumentsPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const profile = await requireProfile()
  // Admin nao envia documento. No preview todo mundo e admin, entao deixamos
  // a tela aberta para que ela possa ser vista.
  if (profile.role === 'admin' && !isPreviewMode()) redirect('/dashboard')

  const [{ welcome }, types, documents, agreements] = await Promise.all([
    searchParams,
    getCustomerDocumentTypes(),
    listMyDocuments(profile.id),
    listAgreements(),
  ])
  const pending = pendingAgreements(agreements)

  const checklist = buildDocumentChecklist(types, documents)
  const required = checklist.filter((item) => item.type.is_required)
  const approved = required.filter((item) => item.document?.status === 'approved').length
  const sent = required.filter((item) => item.document && item.document.status !== 'rejected').length
  const allApproved = approved === required.length
  const allSent = sent === required.length

  return (
    <>
      <PageHeader title="My documents" description="We need these before you can rent a car." />

      {/* O cliente costuma cair nesta pagina primeiro; contrato pendente nao pode passar batido. */}
      {pending.length > 0 && (
        <Link
          href={pending.length === 1 ? `/dashboard/agreements/${pending[0].id}` : '/dashboard/agreements'}
          className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-brand/40 bg-brand/10 p-4 text-sm hover:border-brand/60"
        >
          <FileSignatureIcon className="size-5 shrink-0 text-brand" />
          <span className="flex-1">
            <strong className="font-semibold">
              {pending.length === 1 ? 'Your rental agreement is ready to sign' : `${pending.length} rental agreements are ready to sign`}
            </strong>
            <span className="block text-muted-foreground">
              {pending.length === 1 ? pending[0].vehicle_label : 'Review and sign them to complete your rentals.'}
            </span>
          </span>
          <span className="font-medium text-brand">Review and sign →</span>
        </Link>
      )}

      {welcome && !allSent && (
        <div className="mb-6 rounded-xl border border-brand/30 bg-brand/5 p-5">
          <p className="eyebrow mb-1 text-[0.6rem] text-brand">Step 2 of 2</p>
          <p className="font-semibold">Your account is ready — now upload your documents</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Our team reviews them and gets in touch to arrange your rental. You can leave and come back at any time.
          </p>
        </div>
      )}

      <OverallStatus allApproved={allApproved} allSent={allSent} approved={approved} total={required.length} />

      <div className="mt-6 space-y-4">
        {checklist.map(({ type, document }) => (
          <Card key={type.slug}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {type.label}
                {document ? (
                  <DocumentStatusBadge status={document.status} />
                ) : (
                  <ToneBadge tone={type.is_required ? 'caution' : 'neutral'}>
                    {type.is_required ? 'Required' : 'Optional'}
                  </ToneBadge>
                )}
              </CardTitle>
              {document && (
                <CardDescription>
                  Sent {formatDateTime(document.created_at)}
                  {document.expires_at && <> · Expires {formatDate(document.expires_at)}</>}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {document?.status === 'rejected' && (
                <div role="alert" className="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
                  <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-300" />
                  <div>
                    <p className="font-medium">This document was not accepted</p>
                    {document.notes && <p className="text-muted-foreground">{document.notes}</p>}
                  </div>
                </div>
              )}

              {document && document.status !== 'rejected' && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <FileTextIcon className="size-5 shrink-0 text-brand" />
                  <a
                    href={`/dashboard/files/customer/${document.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {document.file_name ?? 'Document'}
                  </a>
                  {/* Depois de aprovado, so o admin remove -- a RLS impede o cliente. */}
                  {document.status === 'pending' && (
                    <ConfirmActionButton
                      action={deleteCustomerDocumentAction.bind(null, document.id)}
                      title="Remove this file?"
                      description="You'll need to upload it again before we can review your documents."
                      confirmLabel="Remove"
                      variant="ghost"
                      size="icon-sm"
                    >
                      <Trash2Icon />
                      <span className="sr-only">Remove file</span>
                    </ConfirmActionButton>
                  )}
                </div>
              )}

              {!document && !type.is_required && (
                <p className="text-sm text-muted-foreground">
                  Optional. Traveling or don&apos;t have one? You can skip it and show it at pick-up.
                </p>
              )}

              {(!document || document.status === 'rejected') && (
                <DocumentUploadForm type={type} isReplacement={document?.status === 'rejected'} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

function OverallStatus({
  allApproved,
  allSent,
  approved,
  total,
}: {
  allApproved: boolean
  allSent: boolean
  approved: number
  total: number
}) {
  const state = allApproved
    ? { icon: CheckCircle2Icon, tone: 'text-emerald-500', title: "You're cleared to rent", body: 'All your documents are approved. Our team will reach out to arrange your rental.' }
    : allSent
      ? { icon: Clock3Icon, tone: 'text-amber-500', title: 'Documents under review', body: "We've received everything. We'll let you know once they're reviewed." }
      : { icon: AlertCircleIcon, tone: 'text-brand', title: 'Documents missing', body: 'Upload the required documents below so we can review your account.' }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
      <state.icon className={cn('size-8 shrink-0', state.tone)} strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{state.title}</p>
        <p className="text-sm text-muted-foreground">{state.body}</p>
      </div>
      <div className="w-full space-y-1.5 sm:w-48">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Approved</span>
          <span className="tabular-nums">
            {approved} / {total}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Documents approved"
          aria-valuenow={approved}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuetext={`${approved} of ${total} approved`}
        >
          <div className="gold-plate h-full rounded-full transition-all" style={{ width: `${total ? (approved / total) * 100 : 0}%` }} />
        </div>
      </div>
      {allApproved && (
        <Link href="/#fleet" className={cn(buttonVariants({ variant: 'outline' }), 'h-9 px-3')}>
          Browse the fleet
        </Link>
      )}
    </div>
  )
}
