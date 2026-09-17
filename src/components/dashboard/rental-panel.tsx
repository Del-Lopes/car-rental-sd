'use client'

import Link from 'next/link'
import {
  CalendarClockIcon,
  CircleUserRoundIcon,
  FileSignatureIcon,
  HandCoinsIcon,
  ShieldCheckIcon,
  SquarePenIcon,
} from 'lucide-react'
import { useState } from 'react'

import { ConfirmActionButton } from '@/components/dashboard/confirm-action-button'
import { PaymentUrgencyBadge } from '@/components/dashboard/status-badges'
import { RecordPaymentButton } from '@/components/dashboard/record-payment-button'
import { Field, nativeSelectClass } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { closeRentalAction, startRentalAction, updateRentalAction } from '@/lib/actions/rentals'
import { INSURANCE_SUGGESTED_OFFER, RENTAL_PLAN_META } from '@/lib/constants'
import { paymentUrgencyFor } from '@/lib/expiry'
import { formatCurrency, formatDate, formatDaysToExpire } from '@/lib/format'
import { daysUntil } from '@/lib/expiry'
import type { InsuranceChoice, RentalDue, RentalPayment, RentalPlan } from '@/lib/types/database'

export type RentalCustomerOption = { id: string; name: string }

/** Situacao do contrato da locacao ativa, exibida para o admin. */
export type RentalAgreementInfo = {
  id: string
  status: 'pending' | 'signed'
  signedAt: string | null
  insuranceChoice: InsuranceChoice | null
} | null

/** Situacao do seguro, do jeito que o dono precisa ler no painel. */
function insuranceLabel(rental: RentalDue, agreement: RentalAgreementInfo): string {
  if (Number(rental.insurance_amount) > 0) return `Carental · ${formatCurrency(rental.insurance_amount)}`
  if (agreement?.insuranceChoice === 'own') return 'Own insurance'
  if (agreement?.status === 'pending') {
    return rental.insurance_offer_amount !== null
      ? `Renter to choose (offer ${formatCurrency(rental.insurance_offer_amount)})`
      : 'Renter to choose (own only)'
  }
  return 'Not set'
}

/** Data de hoje e a data do proximo vencimento sugerida para cada plano. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function suggestedDue(plan: RentalPlan): string {
  const date = new Date()
  if (plan === 'weekly') date.setDate(date.getDate() + 7)
  else date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 10)
}

export function RentalPanel({
  vehicleId,
  weeklyRate,
  monthlyRate,
  securityDeposit,
  rental,
  payments,
  customers,
  agreement = null,
}: {
  vehicleId: string
  weeklyRate: number
  monthlyRate: number
  securityDeposit: number | null
  rental: RentalDue | null
  payments: RentalPayment[]
  customers: RentalCustomerOption[]
  agreement?: RentalAgreementInfo
}) {
  if (rental) {
    return <ActiveRental rental={rental} payments={payments} agreement={agreement} />
  }
  return (
    <StartRental
      vehicleId={vehicleId}
      weeklyRate={weeklyRate}
      monthlyRate={monthlyRate}
      securityDeposit={securityDeposit}
      customers={customers}
    />
  )
}

function StartRental({
  vehicleId,
  weeklyRate,
  monthlyRate,
  securityDeposit,
  customers,
}: {
  vehicleId: string
  weeklyRate: number
  monthlyRate: number
  securityDeposit: number | null
  customers: RentalCustomerOption[]
}) {
  const { formAction, onSubmit, values, errors } = useFormAction(startRentalAction)
  // O plano define o valor e a data sugeridos; o dono ainda pode trocar os dois.
  const [plan, setPlan] = useState<RentalPlan>('weekly')
  const [customerId, setCustomerId] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rent this vehicle out</CardTitle>
        <CardDescription>
          Registering a rental marks the car as rented and starts the payment reminders on the
          dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
          <input type="hidden" name="vehicle_id" value={vehicleId} />

          <Field label="Customer" name="customer_id" error={errors.customer_id}>
            {(p) => (
              <select
                {...p}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className={nativeSelectClass}
              >
                <option value="">Not a registered customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {!customerId && (
            <Field
              label="Renter name"
              name="renter_name"
              error={errors.renter_name}
              hint="Used when the renter has no account yet."
            >
              {(p) => <Input {...p} defaultValue={values.renter_name} className="h-9" />}
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Plan" name="plan" error={errors.plan}>
              {(p) => (
                <select
                  {...p}
                  value={plan}
                  onChange={(event) => setPlan(event.target.value as RentalPlan)}
                  className={nativeSelectClass}
                >
                  {Object.entries(RENTAL_PLAN_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Amount per cycle" name="rate_amount" error={errors.rate_amount}>
              {(p) => (
                <Input
                  {...p}
                  key={plan}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={plan === 'weekly' ? weeklyRate : monthlyRate}
                  className="h-9"
                />
              )}
            </Field>
            <Field label="Deposit held" name="deposit_amount" error={errors.deposit_amount}>
              {(p) => (
                <Input {...p} type="number" step="0.01" min="0" defaultValue={securityDeposit ?? ''} className="h-9" />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" name="started_on" error={errors.started_on}>
              {(p) => <Input {...p} type="date" defaultValue={today()} className="h-9" />}
            </Field>
            <Field label="Next payment due" name="next_due_on" error={errors.next_due_on}>
              {(p) => <Input {...p} key={plan} type="date" defaultValue={suggestedDue(plan)} className="h-9" />}
            </Field>
          </div>

          {/* O preco do seguro depende da carteira de cada motorista: e sugestao,
              e quem decide usar (ou nao) e o locatario, ao assinar o contrato. */}
          <Field
            label={`Carental insurance offer (per ${plan === 'weekly' ? 'week' : 'month'})`}
            name="insurance_offer_amount"
            error={errors.insurance_offer_amount}
            hint={
              customerId
                ? "Price for this driver if they don't have their own insurance. The renter chooses when signing. Leave empty if not offered."
                : 'Renter has no account, so there is no online choice. Set the charged amount later in "Correct rental data".'
            }
          >
            {(p) => (
              <Input
                {...p}
                key={plan}
                type="number"
                step="0.01"
                min="0"
                defaultValue={INSURANCE_SUGGESTED_OFFER[plan]}
                className="h-9"
              />
            )}
          </Field>

          <Field label="Notes" name="notes" error={errors.notes}>
            {(p) => <Textarea {...p} rows={2} defaultValue={values.notes} />}
          </Field>

          <div className="flex justify-end">
            <SubmitButton pendingLabel="Saving…">Start rental</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ActiveRental({
  rental,
  payments,
  agreement,
}: {
  rental: RentalDue
  payments: RentalPayment[]
  agreement: RentalAgreementInfo
}) {
  const { formAction, onSubmit, values, errors } = useFormAction(updateRentalAction, {
    rate_amount: String(rental.rate_amount),
    insurance_offer_amount: rental.insurance_offer_amount !== null ? String(rental.insurance_offer_amount) : '',
    insurance_amount: String(rental.insurance_amount),
    next_due_on: rental.next_due_on,
    notes: rental.notes ?? '',
  })
  const days = daysUntil(rental.next_due_on)
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const hasInsurance = Number(rental.insurance_amount) > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Active rental
          <PaymentUrgencyBadge
            urgency={paymentUrgencyFor(days)}
            label={days < 0 ? `Overdue ${formatDaysToExpire(days)}` : `Due ${formatDaysToExpire(days)}`}
          />
        </CardTitle>
        <CardDescription>
          {RENTAL_PLAN_META[rental.plan].label} · {formatCurrency(rental.total_amount)}{' '}
          {RENTAL_PLAN_META[rental.plan].everyDaysLabel}
          {hasInsurance && (
            <>
              {' '}
              (rent {formatCurrency(rental.rate_amount)} + insurance {formatCurrency(rental.insurance_amount)})
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Detail icon={CircleUserRoundIcon} label="Renter" value={rental.renter} />
          <Detail icon={CalendarClockIcon} label="Next due" value={formatDate(rental.next_due_on)} />
          <Detail icon={HandCoinsIcon} label="Received so far" value={formatCurrency(totalPaid)} />
          <Detail
            icon={HandCoinsIcon}
            label="Deposit held"
            value={rental.deposit_amount !== null ? formatCurrency(rental.deposit_amount) : '—'}
          />
          <Detail
            icon={ShieldCheckIcon}
            label="Insurance"
            value={insuranceLabel(rental, agreement)}
          />
        </dl>

        <AgreementStatus hasCustomer={Boolean(rental.customer_id)} agreement={agreement} />

        <div className="flex flex-wrap gap-2">
          <RecordPaymentButton
            rentalId={rental.id}
            amount={rental.total_amount}
            insuranceAmount={rental.insurance_amount}
            plan={rental.plan}
            dueOn={rental.next_due_on}
            size="default"
          />
          <ConfirmActionButton
            action={closeRentalAction.bind(null, rental.id)}
            title="Close this rental?"
            description="The vehicle goes back to the public fleet and stops appearing in the payment feed. The payment history is kept."
            confirmLabel="Close rental"
            variant="outline"
          >
            Close rental
          </ConfirmActionButton>
        </div>

        {payments.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {payments.length} {payments.length === 1 ? 'payment' : 'payments'} received
            </summary>
            <ul className="mt-3 space-y-1.5">
              {payments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{formatDate(payment.paid_on)}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(payment.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <details className="text-sm">
          <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <SquarePenIcon className="size-3.5" />
            Correct rental data
          </summary>
          <form action={formAction} onSubmit={onSubmit} className="mt-3 space-y-3" noValidate>
            <input type="hidden" name="rental_id" value={rental.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rent per cycle" name="rate_amount" error={errors.rate_amount}>
                {(p) => (
                  <Input {...p} type="number" step="0.01" min="0" defaultValue={values.rate_amount} className="h-9" />
                )}
              </Field>
              <Field label="Next payment due" name="next_due_on" error={errors.next_due_on}>
                {(p) => <Input {...p} type="date" defaultValue={values.next_due_on} className="h-9" />}
              </Field>
              <Field
                label="Insurance offer"
                name="insurance_offer_amount"
                error={errors.insurance_offer_amount}
                hint="Shown to the renter before signing."
              >
                {(p) => (
                  <Input {...p} type="number" step="0.01" min="0" defaultValue={values.insurance_offer_amount} className="h-9" />
                )}
              </Field>
              <Field
                label="Insurance charged"
                name="insurance_amount"
                error={errors.insurance_amount}
                hint="Added to every payment. 0 = own insurance."
              >
                {(p) => (
                  <Input {...p} type="number" step="0.01" min="0" defaultValue={values.insurance_amount} className="h-9" />
                )}
              </Field>
            </div>
            <Field label="Notes" name="notes" error={errors.notes}>
              {(p) => <Textarea {...p} rows={2} defaultValue={values.notes} />}
            </Field>
            <div className="flex justify-end">
              <SubmitButton variant="secondary" pendingLabel="Saving…">
                Save changes
              </SubmitButton>
            </div>
          </form>
        </details>
      </CardContent>
    </Card>
  )
}

function AgreementStatus({ hasCustomer, agreement }: { hasCustomer: boolean; agreement: RentalAgreementInfo }) {
  if (!hasCustomer) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <FileSignatureIcon className="size-4 shrink-0" />
        No online agreement: the renter has no account.
      </p>
    )
  }
  if (!agreement) return null

  const signed = agreement.status === 'signed'
  return (
    <Link
      href={`/dashboard/agreements/${agreement.id}`}
      className={
        signed
          ? 'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs hover:border-emerald-500/50'
          : 'flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs hover:border-amber-500/50'
      }
    >
      <FileSignatureIcon className={signed ? 'size-4 shrink-0 text-emerald-500' : 'size-4 shrink-0 text-amber-500'} />
      <span className="flex-1">
        {signed && agreement.signedAt
          ? `Agreement signed on ${formatDate(agreement.signedAt.slice(0, 10))}`
          : 'Agreement awaiting customer signature'}
      </span>
      <span className="font-medium">View →</span>
    </Link>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
