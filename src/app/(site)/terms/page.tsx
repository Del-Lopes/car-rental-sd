import type { Metadata } from 'next'
import Link from 'next/link'

import { TermsText } from '@/components/agreements/terms-text'
import { getCurrentTerms } from '@/lib/data/agreements'
import { formatDate } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Terms of rental',
  description: 'The terms every Carental renter agrees to before taking a vehicle.',
}

export default async function TermsPage() {
  const terms = await getCurrentTerms()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow mb-2 text-brand">Legal</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Terms of rental</h1>

      {terms ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Version {terms.version} · Last updated {formatDate(terms.created_at)}
          </p>
          <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
            <TermsText body={terms.body} />
          </div>
        </>
      ) : (
        <p className="mt-6 text-muted-foreground">
          Our full rental terms are being finalized. In the meantime, see the{' '}
          <Link href="/#rental-terms" className="text-brand hover:underline">
            rental requirements
          </Link>
          .
        </p>
      )}
    </div>
  )
}
