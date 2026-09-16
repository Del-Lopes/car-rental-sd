import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Envio de e-mail transacional via SMTP.
 *
 * Hoje configurado para o Gmail do Carental (senha de app do Google). O e-mail
 * do Supabase Auth nao serve aqui: ele so envia mensagens de autenticacao.
 * Quando houver dominio proprio, basta trocar as variaveis SMTP_* por um
 * provedor profissional -- nada mais muda.
 *
 * Sem as variaveis configuradas o envio e pulado sem erro: um e-mail que falha
 * nao pode desfazer uma assinatura de contrato valida.
 */

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.gmail.com'
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465)
const SMTP_USER = process.env.SMTP_USER ?? ''
const SMTP_PASS = process.env.SMTP_PASS ?? ''
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? 'Carental'

let transporter: Transporter | null = null

export function isEmailConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS)
}

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return transporter
}

export type MailMessage = {
  to: string
  subject: string
  html: string
  text: string
  /** Copia oculta para a propria caixa do Carental, que fica com o registro. */
  copyToSender?: boolean
}

export async function sendMail(message: MailMessage): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) return { sent: false, error: 'Email is not configured' }

  try {
    await getTransporter().sendMail({
      from: { name: MAIL_FROM_NAME, address: SMTP_USER },
      to: message.to,
      bcc: message.copyToSender ? SMTP_USER : undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
    return { sent: true }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error('[mailer] failed to send email:', reason)
    return { sent: false, error: reason }
  }
}
