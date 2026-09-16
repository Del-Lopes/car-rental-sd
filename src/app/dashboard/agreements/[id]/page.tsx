import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2Icon, Clock3Icon, MailCheckIcon, MailWarningIcon } from 'lucide-react'

import { ResendEmailButton } from '@/components/agreements/resend-email-button'
import { SignAgreementForm } from '@/components/agreements/sign-agreement-form'
import { TermsText } from '@/components/agreements/terms-text'
import { PageHeader } from '@/components/dashboard/page-header'
import { ToneBadge } from '@/components/dashboard/status-badges'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfile } from '@/lib/auth'
import { RENTAL_PLAN_META } from '@/lib/constants'
import { getAgreement, getCurrentTerms, getTermsVersion } from '@/lib/data/agreements'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { isPreviewMode } from '@/lib/preview'

export const metadata: Metadata = { title: 'Rental agreement' }

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ signed?: string; email?: string }>

export default async function AgreementPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const profile = await requireProfile()
  const [{ id }, { signed: justSigned, email }] = await Promise.all([params, searchParams])

  // A RLS so devolve o contrato ao dono ou ao admin; qualquer outro cai no 404.
  const agreement = await getAgreement(id)
  if (!agreement) notFound()

  const isAdmin = profile.role === 'admin'
  const isSigned = agreement.status === 'signed'
  // No preview todo mundo navega como admin; liberamos o formulario para que a
  // tela de assinatura possa ser vista. Com banco real, so o dono assina.
  const isOwner = agreement.customer_id === profile.id || isPreviewMode()

  // Assinado: o texto e o da versao aceita. Pendente: o vigente, que e o que sera assinado.
  const terms = isSigned && agreement.terms_version_id
    ? await getTermsVersion(agreement.terms_version_id)
    : await getCurrentTerms()

  const snapshot = agreement.rental_snapshot
  const plan = RENTAL_PLAN_META[snapshot?.plan ?? agreement.plan]
  const details: Array<[string, string]> = [
    ['Vehicle', snapshot?.vehicle ?? agreement.vehicle_label],
    ['Renter', snapshot?.renter ?? agreement.customer_name ?? '—'],
    ['Plan', plan.label],
    [`Amount (${plan.everyDaysLabel})`, formatCurrency(snapshot?.rate_amount ?? agreement.rate_amount)],
    [
      'Security deposit',
      (snapshot?.deposit_amount ?? agreement.deposit_amount) !== null
        ? formatCurrency((snapshot?.deposit_amount ?? agreement.deposit_amount)!)
        : '—',
    ],
    ['Start date', formatDate(snapshot?.started_on ?? agreement.started_on)],
    ...(snapshot ? ([['Next payment due', formatDate(snapshot.next_due_on)]] as Array<[string, string]>) : []),
  ]

  const canSign = !isSigned && isOwner && agreement.rental_status === 'active'

  return (
    <>
      <PageHeader
        title="Rental agreement"
        description={agreement.vehicle_label}
        back={{ href: '/dashboard/agreements', label: 'Agreements' }}
        actions={
          isSigned ? (
            <ToneBadge tone="success">Signed</ToneBadge>
          ) : agreement.rental_status === 'active' ? (
            <ToneBadge tone="caution">Awaiting signature</ToneBadge>
          ) : (
            <ToneBadge tone="neutral">Rental closed</ToneBadge>
          )
        }
      />

      {justSigned && (
        <div role="status" className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-semibold">Agreement signed. Thank you!</p>
            <p className="text-muted-foreground">
              {email === '0'
                ? "We couldn't email your copy right now — you can always find it here, and our team has been notified."
                : 'A copy was sent to your email address.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="order-2 space-y-6 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle>Terms{terms ? ` · version ${terms.version}` : ''}</CardTitle>
              <CardDescription>
                {isSigned ? 'The exact text that was agreed to.' : 'Please read the full text before signing.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {terms ? (
                <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-border bg-background p-5">
                  <TermsText body={terms.body} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The rental terms have not been published yet. {isAdmin ? 'Publish them in Terms.' : 'Carental will let you know when this agreement is ready to sign.'}
                </p>
              )}
            </CardContent>
          </Card>

          {canSign && terms && (
            <Card className="border-brand/40">
              <CardHeader>
                <CardTitle>Sign this agreement</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.full_name ? (
                  <SignAgreementForm
                    agreementId={agreement.id}
                    termsVersionId={terms.id}
                    termsVersion={terms.version}
                    expectedName={profile.full_name}
                  />
                ) : (
                  <p className="text-sm">
                    Add your full name in{' '}
                    <Link href="/dashboard/account" className="font-medium text-brand hover:underline">
                      Account
                    </Link>{' '}
                    first — it is used as your signature.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle>Rental details</CardTitle>
              {isSigned && <CardDescription>Recorded at the moment of signing.</CardDescription>}
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                {details.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {isSigned ? (
            <Card>
              <CardHeader>
                <CardTitle>Electronic signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="border-b border-border pb-3 font-serif text-2xl italic">{agreement.signed_name}</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Signed at</dt>
                    <dd className="text-right font-medium">{agreement.signed_at && formatDateTime(agreement.signed_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Terms</dt>
                    <dd className="font-medium">v{agreement.terms_version}</dd>
                  </div>
                  {isAdmin && agreement.signer_ip && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">IP address</dt>
                      <dd className="font-mono text-xs">{agreement.signer_ip}</dd>
                    </div>
                  )}
                </dl>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {agreement.email_sent_at ? (
                    <>
                      <MailCheckIcon className="size-4 text-emerald-500" />
                      Copy emailed {formatDateTime(agreement.email_sent_at)}
                    </>
                  ) : (
                    <>
                      <MailWarningIcon className="size-4 text-amber-500" />
                      Email copy not sent yet
                    </>
                  )}
                </p>
                {isAdmin && (
                  <ResendEmailButton agreementId={agreement.id} alreadySent={Boolean(agreement.email_sent_at)} />
                )}
              </CardContent>
            </Card>
          ) : (
            isAdmin && (
              <Card>
                <CardContent className="flex items-start gap-3 pt-6 text-sm">
                  <Clock3Icon className="mt-0.5 size-5 shrink-0 text-amber-500" />
                  <p>
                    Waiting for <strong>{agreement.customer_name ?? 'the customer'}</strong> to sign from
                    their account. It appears in their dashboard under Agreements.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    </>
  )
}
