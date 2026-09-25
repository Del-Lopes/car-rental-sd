import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Envio de e-mail transacional via SMTP.
 *
 * Configurado para o Brevo (plano gratuito, 300 e-mails/dia), que funciona sem
 * dominio proprio e sem verificacao em 2 etapas no Gmail. O e-mail do Supabase
 * Auth nao serve aqui: ele so envia mensagens de autenticacao.
 *
 * Remetente: o Brevo nao consegue autenticar enderecos @gmail.com e troca o
 * dominio de envio por @brevosend.com. O nome "Carental" e mantido e as
 * respostas vao para MAIL_FROM_ADDRESS. Com dominio proprio isso some -- e so
 * autenticar o dominio no Brevo e trocar MAIL_FROM_ADDRESS.
 *
 * Qualquer outro SMTP serve trocando as variaveis; nada no codigo muda.
 *
 * Sem as variaveis configuradas o envio e pulado sem erro: um e-mail que falha
 * nao pode desfazer uma assinatura de contrato valida.
 */

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp-relay.brevo.com'
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587)
const SMTP_USER = process.env.SMTP_USER ?? ''
const SMTP_PASS = process.env.SMTP_PASS ?? ''
/** Endereco da caixa do Carental: remetente, destino das respostas e da copia. */
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS ?? ''
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? 'Carental'

let transporter: Transporter | null = null

export function isEmailConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS && MAIL_FROM_ADDRESS)
}

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // 465 usa TLS direto; 587 comeca sem e sobe para TLS (STARTTLS).
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // A assinatura espera o envio terminar. Sem limites, um servidor de e-mail
    // lento seguraria a requisicao ate a funcao da Vercel morrer -- e o cliente
    // veria um erro depois de ja ter assinado.
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  })
  return transporter
}

export type MailMessage = {
  to: string
  subject: string
  html: string
  text: string
  /** Copia oculta para a caixa do Carental, que fica com o registro. */
  copyToCarental?: boolean
}

export async function sendMail(message: MailMessage): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) return { sent: false, error: 'Email is not configured' }

  try {
    await getTransporter().sendMail({
      from: { name: MAIL_FROM_NAME, address: MAIL_FROM_ADDRESS },
      replyTo: MAIL_FROM_ADDRESS,
      to: message.to,
      bcc: message.copyToCarental ? MAIL_FROM_ADDRESS : undefined,
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
