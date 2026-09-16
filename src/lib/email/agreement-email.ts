import 'server-only'

import { RENTAL_PLAN_META } from '@/lib/constants'
import { SITE_URL } from '@/lib/env'
import { formatCurrency, formatDate } from '@/lib/format'
import type { RentalSnapshot } from '@/lib/types/database'

/**
 * E-mail de confirmacao do contrato assinado: resumo do aluguel, dados da
 * assinatura e o texto integral dos termos que o cliente aceitou.
 *
 * HTML com estilos inline e layout em tabela porque e o unico formato que os
 * clientes de e-mail (Gmail, Outlook) renderizam de forma confiavel. A versao
 * em texto puro acompanha para quem nao exibe HTML.
 */

type AgreementEmailInput = {
  agreementId: string
  customerName: string
  snapshot: RentalSnapshot
  termsVersion: number
  termsBody: string
  signedName: string
  signedAt: string
  signerIp: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'long',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(iso))
}

export function buildAgreementEmail(input: AgreementEmailInput) {
  const { snapshot } = input
  const plan = RENTAL_PLAN_META[snapshot.plan]
  const viewUrl = `${SITE_URL}/dashboard/agreements/${input.agreementId}`
  const signedAt = formatTimestamp(input.signedAt)

  const summaryRows: Array<[string, string]> = [
    ['Vehicle', snapshot.vehicle],
    ['Plan', plan.label],
    [`Amount (${plan.everyDaysLabel})`, formatCurrency(snapshot.rate_amount)],
    ['Security deposit', snapshot.deposit_amount !== null ? formatCurrency(snapshot.deposit_amount) : '—'],
    ['Start date', formatDate(snapshot.started_on)],
    ['Next payment due', formatDate(snapshot.next_due_on)],
  ]

  const signatureRows: Array<[string, string]> = [
    ['Signed by', input.signedName],
    ['Signed at', signedAt],
    ['Terms version', `v${input.termsVersion}`],
    ...(input.signerIp ? ([['IP address', input.signerIp]] as Array<[string, string]>) : []),
    ['Agreement ID', input.agreementId],
  ]

  const subject = `Your Carental rental agreement — ${snapshot.vehicle}`

  const table = (rows: Array<[string, string]>) =>
    rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding:8px 0;color:#6b6b6b;font-size:14px;width:45%;">${escapeHtml(label)}</td>
            <td style="padding:8px 0;color:#141414;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
          </tr>`,
      )
      .join('')

  const termsHtml = escapeHtml(input.termsBody)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 12px;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ee;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#141414;padding:24px;text-align:center;">
              <span style="display:inline-block;background:#d9b451;color:#0d0d0d;font-weight:700;letter-spacing:4px;padding:8px 16px;border-radius:6px;font-size:14px;">CARENTAL</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#141414;">Your rental agreement is signed</h1>
              <p style="margin:0;color:#4a4a4a;font-size:15px;line-height:1.5;">
                Hi ${escapeHtml(input.customerName)}, thanks for renting with Carental. This email is your copy of the
                agreement you signed. Please keep it for your records.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;">
              <h2 style="margin:0 0 4px;font-size:15px;color:#141414;">Rental summary</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #ece8df;">${table(summaryRows)}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 16px;">
              <h2 style="margin:0 0 4px;font-size:15px;color:#141414;">Electronic signature</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #ece8df;">${table(signatureRows)}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;text-align:center;">
              <a href="${escapeHtml(viewUrl)}" style="display:inline-block;background:#d9b451;color:#0d0d0d;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;font-size:14px;">View agreement online</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <h2 style="margin:0 0 12px;font-size:15px;color:#141414;">Terms you agreed to (v${input.termsVersion})</h2>
              <div style="border:1px solid #ece8df;border-radius:8px;padding:16px;color:#3a3a3a;font-size:13px;line-height:1.6;">${termsHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f4;padding:16px 28px;color:#8a8a8a;font-size:12px;text-align:center;">
              Carental · Where affordable meets quality
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = [
    'CARENTAL — YOUR RENTAL AGREEMENT IS SIGNED',
    '',
    `Hi ${input.customerName}, this email is your copy of the agreement you signed.`,
    '',
    'RENTAL SUMMARY',
    ...summaryRows.map(([label, value]) => `${label}: ${value}`),
    '',
    'ELECTRONIC SIGNATURE',
    ...signatureRows.map(([label, value]) => `${label}: ${value}`),
    '',
    `View online: ${viewUrl}`,
    '',
    `TERMS YOU AGREED TO (v${input.termsVersion})`,
    input.termsBody,
  ].join('\n')

  return { subject, html, text }
}
