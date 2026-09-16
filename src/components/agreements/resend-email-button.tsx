'use client'

import { Loader2Icon, MailIcon } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { resendAgreementEmailAction } from '@/lib/actions/agreements'

export function ResendEmailButton({ agreementId, alreadySent }: { agreementId: string; alreadySent: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      className="h-9 px-3"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resendAgreementEmailAction(agreementId)
          if (result.ok) toast.success(result.message ?? 'Email sent')
          else toast.error(result.message ?? 'Could not send the email')
        })
      }
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <MailIcon />}
      {alreadySent ? 'Resend email' : 'Send email'}
    </Button>
  )
}
