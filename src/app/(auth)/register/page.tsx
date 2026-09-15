import type { Metadata } from 'next'
import Link from 'next/link'

import { RegisterForm } from '@/components/auth/register-form'
import { getCustomerDocumentTypes } from '@/lib/data/lookups'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Create account',
  description: "Create your Carental account and upload your driver's license to rent.",
}

export default async function RegisterPage() {
  const documentTypes = await getCustomerDocumentTypes()
  const required = documentTypes.filter((type) => type.is_required)

  return (
    <div className="space-y-6">
      <Steps current={1} />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Next you&apos;ll upload the documents we need to approve your rental:
        </p>
        {/* Lista vem do banco: se o cliente mudar os documentos exigidos, esta tela acompanha. */}
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {required.map((type) => (
            <li key={type.slug} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              {type.label}
            </li>
          ))}
        </ul>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

function Steps({ current }: { current: 1 | 2 }) {
  const steps = ['Account', 'Documents']
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Registration steps">
      {steps.map((label, index) => {
        const step = index + 1
        const active = step === current
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full border text-[0.65rem] font-semibold',
                active ? 'border-brand bg-brand text-primary-foreground' : 'border-border text-muted-foreground',
              )}
            >
              {step}
            </span>
            <span className={active ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
            {step < steps.length && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
