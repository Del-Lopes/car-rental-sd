'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { requireAdmin, requireProfile } from '@/lib/auth'
import { buildAgreementEmail } from '@/lib/email/agreement-email'
import { isEmailConfigured, sendMail } from '@/lib/email/mailer'
import { PREVIEW_WRITE_MESSAGE, isPreviewMode } from '@/lib/preview'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { publishTermsSchema, signAgreementSchema } from '@/lib/validation/agreements'
import { failure, success, validationFailure, type ActionResult } from '@/lib/actions/result'

/**
 * Termos e contratos.
 *
 * A assinatura passa pelo service_role de proposito: o cliente nao pode chamar
 * a funcao de assinatura direto pela API, senao poderia informar um IP falso.
 * Aqui o servidor valida a sessao, le IP e navegador da requisicao real e so
 * entao assina em nome dele.
 */

export async function publishTermsAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = publishTermsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('terms_versions')
    .insert({ body: parsed.data.body })
    .select('version')
    .single()

  if (error) return failure(error.message)

  revalidatePath('/dashboard/terms')
  revalidatePath('/terms')
  return success(`Terms version ${data.version} published`)
}

export async function signAgreementAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = signAgreementSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return failure('Online signing is not configured yet. Please contact Carental.')
  }

  const requestHeaders = await headers()
  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip') ||
    'unknown'
  const userAgent = requestHeaders.get('user-agent') ?? 'unknown'

  const admin = createAdminClient()
  const { data: signed, error } = await admin.rpc('sign_rental_agreement', {
    p_agreement_id: parsed.data.agreement_id,
    p_customer_id: profile.id,
    p_terms_version_id: parsed.data.terms_version_id,
    p_signed_name: parsed.data.signed_name,
    p_ip: ip,
    p_user_agent: userAgent,
  })

  // As mensagens levantadas pela funcao ja sao escritas para o cliente ler.
  if (error) {
    if (error.message.includes('must match')) {
      return failure(error.message, { signed_name: [error.message] })
    }
    return failure(error.message)
  }

  const delivery = await deliverAgreementEmail(signed.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/agreements')
  revalidatePath(`/dashboard/agreements/${signed.id}`)
  redirect(`/dashboard/agreements/${signed.id}?signed=1${delivery.sent ? '' : '&email=0'}`)
}

/** Reenvio manual pelo admin, para quando o e-mail da assinatura falhou. */
export async function resendAgreementEmailAction(agreementId: string): Promise<ActionResult> {
  await requireAdmin()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)
  if (!isEmailConfigured()) return failure('Email is not configured (SMTP settings missing).')

  const delivery = await deliverAgreementEmail(agreementId)
  if (!delivery.sent) return failure(`Could not send the email: ${delivery.error ?? 'unknown error'}`)

  revalidatePath(`/dashboard/agreements/${agreementId}`)
  return success('Agreement email sent')
}

/**
 * Monta e envia o e-mail a partir do que esta gravado no banco -- nunca do
 * formulario -- para que a copia do cliente seja identica ao registro.
 */
async function deliverAgreementEmail(agreementId: string): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { sent: false, error: 'Email is not configured' }
  }

  const admin = createAdminClient()
  const { data: agreement } = await admin
    .from('rental_agreements')
    .select('*')
    .eq('id', agreementId)
    .maybeSingle()

  if (!agreement || agreement.status !== 'signed' || !agreement.rental_snapshot || !agreement.terms_version_id) {
    return { sent: false, error: 'Agreement is not signed' }
  }

  const [{ data: terms }, { data: customer }] = await Promise.all([
    admin.from('terms_versions').select('version, body').eq('id', agreement.terms_version_id).maybeSingle(),
    agreement.customer_id
      ? admin.from('profiles').select('email, full_name').eq('id', agreement.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!terms || !customer?.email) return { sent: false, error: 'Missing terms or customer email' }

  const email = buildAgreementEmail({
    agreementId: agreement.id,
    customerName: customer.full_name ?? agreement.signed_name ?? 'there',
    snapshot: agreement.rental_snapshot,
    termsVersion: terms.version,
    termsBody: terms.body,
    signedName: agreement.signed_name!,
    signedAt: agreement.signed_at!,
    signerIp: agreement.signer_ip,
  })

  const result = await sendMail({ to: customer.email, ...email, copyToSender: true })

  if (result.sent) {
    await admin
      .from('rental_agreements')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', agreement.id)
  }

  return result
}
