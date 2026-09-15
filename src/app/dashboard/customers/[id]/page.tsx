import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FileTextIcon, MailIcon, PhoneIcon } from 'lucide-react'

import { DocumentReviewForm } from '@/components/dashboard/document-review-form'
import { PageHeader } from '@/components/dashboard/page-header'
import { DocumentStatusBadge, ToneBadge } from '@/components/dashboard/status-badges'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth'
import { buildDocumentChecklist, getCustomer } from '@/lib/data/customers'
import { getCustomerDocumentTypes } from '@/lib/data/lookups'
import { formatDate, formatDateTime } from '@/lib/format'
import type { CustomerDocument } from '@/lib/types/database'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const customer = await getCustomer(id)
  return { title: customer?.full_name ?? 'Customer' }
}

export default async function CustomerDetailPage({ params }: { params: Params }) {
  await requireAdmin()
  const { id } = await params
  const [customer, documentTypes] = await Promise.all([getCustomer(id), getCustomerDocumentTypes()])

  if (!customer) notFound()

  const checklist = buildDocumentChecklist(documentTypes, customer.customer_documents)
  const approvedRequired = checklist.filter((item) => item.type.is_required && item.document?.status === 'approved').length
  const totalRequired = checklist.filter((item) => item.type.is_required).length
  const isComplete = approvedRequired === totalRequired

  return (
    <>
      <PageHeader
        title={customer.full_name ?? 'Unnamed customer'}
        description={`Customer since ${formatDate(customer.created_at)}`}
        back={{ href: '/dashboard/customers', label: 'Customers' }}
        actions={
          isComplete ? (
            <ToneBadge tone="success">Cleared to rent</ToneBadge>
          ) : (
            <ToneBadge tone="caution">
              {approvedRequired} of {totalRequired} documents approved
            </ToneBadge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-2 break-all hover:text-brand">
                <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                {customer.email}
              </a>
            )}
            {customer.phone ? (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-brand">
                <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
                {customer.phone}
              </a>
            ) : (
              <p className="flex items-center gap-2 text-muted-foreground">
                <PhoneIcon className="size-4 shrink-0" />
                No phone on file
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {checklist.map(({ type, document }) => {
            const history = customer.customer_documents
              .filter((doc) => doc.type_slug === type.slug && doc.id !== document?.id)
              .sort((a, b) => b.created_at.localeCompare(a.created_at))

            return (
              <Card key={type.slug}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {type.label}
                    {document ? (
                      <DocumentStatusBadge status={document.status} />
                    ) : (
                      <ToneBadge tone={type.is_required ? 'danger' : 'neutral'}>Not uploaded</ToneBadge>
                    )}
                  </CardTitle>
                  {document && (
                    <CardDescription>
                      Uploaded {formatDateTime(document.created_at)}
                      {document.expires_at && <> · Expires {formatDate(document.expires_at)}</>}
                      {document.reviewed_at && <> · Reviewed {formatDateTime(document.reviewed_at)}</>}
                    </CardDescription>
                  )}
                </CardHeader>

                {document && (
                  <CardContent className="space-y-4">
                    <DocumentFileLink document={document} />

                    {/* Pendente pede decisao agora; o que ja foi decidido fica recolhido. */}
                    {document.status === 'pending' ? (
                      <DocumentReviewForm document={document} />
                    ) : (
                      <>
                        {document.notes && (
                          <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Note sent: </span>
                            {document.notes}
                          </p>
                        )}
                        <details className="group text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Change decision
                          </summary>
                          <div className="mt-3">
                            <DocumentReviewForm document={document} />
                          </div>
                        </details>
                      </>
                    )}

                    {history.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          {history.length} earlier {history.length === 1 ? 'upload' : 'uploads'}
                        </summary>
                        <ul className="mt-3 space-y-2">
                          {history.map((doc) => (
                            <li key={doc.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <DocumentStatusBadge status={doc.status} />
                              {formatDateTime(doc.created_at)}
                              {doc.notes && <span>— {doc.notes}</span>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </>
  )
}

function DocumentFileLink({ document }: { document: CustomerDocument }) {
  return (
    <a
      href={`/dashboard/files/customer/${document.id}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm transition-colors hover:border-brand/40"
    >
      <FileTextIcon className="size-5 shrink-0 text-brand" />
      <span className="min-w-0 flex-1 truncate">{document.file_name ?? 'Document'}</span>
      <span className="text-xs text-muted-foreground">Open</span>
    </a>
  )
}
