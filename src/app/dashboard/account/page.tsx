import type { Metadata } from 'next'

import { PasswordForm, ProfileForm } from '@/components/customer/account-forms'
import { PageHeader } from '@/components/dashboard/page-header'
import { requireProfile } from '@/lib/auth'

export const metadata: Metadata = { title: 'Account' }

export default async function AccountPage() {
  const profile = await requireProfile()

  return (
    <>
      <PageHeader title="Account" description="Your personal details and password." />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <ProfileForm fullName={profile.full_name ?? ''} phone={profile.phone ?? ''} email={profile.email ?? ''} />
        <PasswordForm />
      </div>
    </>
  )
}
