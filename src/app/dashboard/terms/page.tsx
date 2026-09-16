import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLinkIcon } from 'lucide-react'

import { PublishTermsForm } from '@/components/agreements/publish-terms-form'
import { TermsText } from '@/components/agreements/terms-text'
import { PageHeader } from '@/components/dashboard/page-header'
import { ToneBadge } from '@/components/dashboard/status-badges'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth'
import { listTermsVersions } from '@/lib/data/agreements'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Terms' }

export default async function TermsAdminPage() {
  await requireAdmin()
  const versions = await listTermsVersions()
  const current = versions[0] ?? null

  return (
    <>
      <PageHeader
        title="Rental terms"
        description="The text every customer reads and signs before a rental."
        actions={
          current && (
            <Link href="/terms" target="_blank" className={cn(buttonVariants({ variant: 'outline' }), 'h-9 px-3')}>
              <ExternalLinkIcon />
              View public page
            </Link>
          )
        }
      />

      {!current && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <strong className="font-semibold">No terms published yet.</strong> Customers cannot sign
          rental agreements until the first version is published.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {current ? 'Edit and publish' : 'Publish the first version'}
              {current && <ToneBadge tone="brand">Current: v{current.version}</ToneBadge>}
            </CardTitle>
            <CardDescription>
              Have the text reviewed by your legal advisor before publishing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublishTermsForm currentBody={current?.body ?? ''} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Version history</CardTitle>
            <CardDescription>Published versions are permanent and cannot be edited.</CardDescription>
          </CardHeader>
          <CardContent>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing published yet.</p>
            ) : (
              <ul className="space-y-2">
                {versions.map((version) => (
                  <li key={version.id}>
                    <details className="group rounded-lg border border-border px-3 py-2">
                      <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                        <span className="font-medium">Version {version.version}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(version.created_at)}</span>
                      </summary>
                      <div className="mt-3 max-h-64 overflow-y-auto border-t border-border pt-3">
                        <TermsText body={version.body} className="text-xs" />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
