'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireProfile } from '@/lib/auth'
import { SITE_URL } from '@/lib/env'
import { safeRedirectPath } from '@/lib/redirect'
import { PREVIEW_WRITE_MESSAGE, isPreviewMode } from '@/lib/preview'
import { createClient } from '@/lib/supabase/server'
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/validation/auth'
import { failure, success, validationFailure, type ActionResult } from '@/lib/actions/result'

/**
 * Autenticacao.
 *
 * O papel (admin/customer) nunca vem do formulario: todo cadastro nasce como
 * 'customer' pelo trigger handle_new_user, e a promocao a admin e feita fora
 * do fluxo publico (script scripts/create-admin.ts).
 */

const ONBOARDING_PATH = '/dashboard/documents?welcome=1'

export async function signInAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  // Sem banco nao ha como autenticar: o preview so leva direto ao painel.
  if (isPreviewMode()) redirect(safeRedirectPath(parsed.data.redirectTo))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  // Mensagem generica de proposito: dizer qual dos dois esta errado ajudaria
  // alguem a descobrir quais emails existem na base.
  if (error) return failure('Invalid email or password')

  revalidatePath('/', 'layout')
  redirect(safeRedirectPath(parsed.data.redirectTo))
}

export async function signUpAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)
  // No preview nao ha conta para criar; seguimos para a etapa de documentos
  // para que o fluxo completo de cadastro possa ser demonstrado.
  if (isPreviewMode()) redirect(ONBOARDING_PATH)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Confirmado o e-mail, o cliente cai direto na etapa de documentos.
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(ONBOARDING_PATH)}`,
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? '',
      },
    },
  })

  if (error) return failure(error.message)

  // O cliente definiu que os documentos sao enviados no cadastro. O upload so
  // pode acontecer com sessao (a policy do Storage exige auth.uid()), entao o
  // cadastro tem duas etapas: conta e depois documentos. Se a confirmacao de
  // e-mail estiver desligada no Supabase, a sessao ja vem aqui e seguimos direto.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect(ONBOARDING_PATH)
  }

  return success('Account created. Check your inbox to confirm your email, then upload your documents.')
}

export async function signOutAction(): Promise<void> {
  if (isPreviewMode()) redirect('/')

  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function requestPasswordResetAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/dashboard/account`,
  })

  // Sempre a mesma resposta, exista o email ou nao.
  return success('If that email is registered, a reset link is on its way.')
}

export async function updatePasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireProfile()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) return failure(error.message)
  return success('Password updated')
}

export async function updateProfileAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (isPreviewMode()) return failure(PREVIEW_WRITE_MESSAGE)

  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone ?? null })
    .eq('id', profile.id)

  if (error) return failure(error.message)

  revalidatePath('/dashboard/account')
  return success('Profile updated')
}
