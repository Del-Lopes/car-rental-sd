import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from '@/components/auth/login-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isPreviewMode } from '@/lib/preview'
import { safeRedirectPath } from '@/lib/redirect'

export const metadata: Metadata = { title: 'Sign in' }

const LINK_ERRORS: Record<string, string> = {
  missing_code: 'That link is incomplete. Request a new one.',
  invalid_link: 'That link has expired or was already used. Request a new one.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}) {
  const { redirectTo, error } = await searchParams
  const linkError = error ? LINK_ERRORS[error] : undefined

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your Carental account.</p>
      </div>

      {linkError && (
        <Alert variant="destructive">
          <AlertDescription>{linkError}</AlertDescription>
        </Alert>
      )}

      {isPreviewMode() && (
        <Alert>
          <AlertDescription>Preview mode: any email and password opens the dashboard.</AlertDescription>
        </Alert>
      )}

      <LoginForm redirectTo={redirectTo ? safeRedirectPath(redirectTo) : undefined} />

      <p className="text-center text-sm text-muted-foreground">
        New to Carental?{' '}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
