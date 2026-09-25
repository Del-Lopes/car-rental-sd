'use client'

import { Field, nativeSelectClass } from '@/components/forms/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { useFormAction } from '@/components/forms/use-form-action'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ActionResult } from '@/lib/actions/result'
import { FUEL_LABELS, TRANSMISSION_LABELS, VEHICLE_STATUS_META } from '@/lib/constants'
import { STANDARD_SECURITY_DEPOSIT } from '@/lib/rental-terms'
import type { Vehicle, VehicleCategory } from '@/lib/types/database'

type Action = (state: ActionResult, formData: FormData) => Promise<ActionResult>

/** Converte o veiculo salvo para o formato de valores do formulario. */
function toValues(vehicle?: Vehicle): Record<string, string> {
  // Carro novo ja nasce com a caucao padrao do cliente; continua editavel.
  if (!vehicle) {
    return {
      status: 'available',
      transmission: 'automatic',
      security_deposit: String(STANDARD_SECURITY_DEPOSIT),
    }
  }
  return Object.fromEntries(
    Object.entries(vehicle).map(([key, value]) => [
      key,
      value === null || value === undefined ? '' : typeof value === 'boolean' ? (value ? 'on' : '') : String(value),
    ]),
  )
}

export function VehicleForm({
  action,
  categories,
  vehicle,
  submitLabel,
  statusLocked = false,
}: {
  action: Action
  categories: VehicleCategory[]
  vehicle?: Vehicle
  submitLabel: string
  /** Locacao aberta manda no status: quem devolve o carro a vitrine e o encerramento. */
  statusLocked?: boolean
}) {
  const { formAction, onSubmit, values, errors } = useFormAction(action, toValues(vehicle))
  const input = 'h-9'

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Vehicle</CardTitle>
          <CardDescription>What customers see in the fleet.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Make" name="make" error={errors.make}>
            {(p) => <Input {...p} defaultValue={values.make} placeholder="Toyota" className={input} />}
          </Field>
          <Field label="Model" name="model" error={errors.model}>
            {(p) => <Input {...p} defaultValue={values.model} placeholder="Camry" className={input} />}
          </Field>
          <Field label="Year" name="year" error={errors.year}>
            {(p) => <Input {...p} type="number" inputMode="numeric" defaultValue={values.year} className={input} />}
          </Field>

          <Field label="Category" name="category_slug" error={errors.category_slug}>
            {(p) => (
              <select {...p} defaultValue={values.category_slug ?? ''} className={nativeSelectClass}>
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Transmission" name="transmission" error={errors.transmission}>
            {(p) => (
              <select {...p} defaultValue={values.transmission} className={nativeSelectClass}>
                {Object.entries(TRANSMISSION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Fuel" name="fuel" error={errors.fuel}>
            {(p) => (
              <select {...p} defaultValue={values.fuel ?? ''} className={nativeSelectClass}>
                <option value="">—</option>
                {Object.entries(FUEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Seats" name="seats" error={errors.seats}>
            {(p) => <Input {...p} type="number" inputMode="numeric" defaultValue={values.seats} className={input} />}
          </Field>
          <Field label="Doors" name="doors" error={errors.doors}>
            {(p) => <Input {...p} type="number" inputMode="numeric" defaultValue={values.doors} className={input} />}
          </Field>
          <Field label="Color" name="color" error={errors.color}>
            {(p) => <Input {...p} defaultValue={values.color} className={input} />}
          </Field>
          <Field label="Mileage (mi)" name="mileage" error={errors.mileage}>
            {(p) => <Input {...p} type="number" inputMode="numeric" defaultValue={values.mileage} className={input} />}
          </Field>

          <Field label="Description" name="description" error={errors.description} className="sm:col-span-2 lg:col-span-3">
            {(p) => <Textarea {...p} rows={3} defaultValue={values.description} />}
          </Field>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Weekly and monthly rates in USD. No daily rate, no mileage cap.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Weekly" name="weekly_rate" error={errors.weekly_rate}>
              {(p) => <Input {...p} type="number" step="0.01" min="0" defaultValue={values.weekly_rate} className={input} />}
            </Field>
            <Field label="Monthly" name="monthly_rate" error={errors.monthly_rate}>
              {(p) => <Input {...p} type="number" step="0.01" min="0" defaultValue={values.monthly_rate} className={input} />}
            </Field>
            <Field label="Deposit" name="security_deposit" error={errors.security_deposit}>
              {(p) => (
                <Input {...p} type="number" step="0.01" min="0" defaultValue={values.security_deposit} className={input} />
              )}
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>Internal data. Plate and VIN are never shown on the public site.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Plate" name="plate" error={errors.plate}>
              {(p) => <Input {...p} defaultValue={values.plate} className={`${input} uppercase`} />}
            </Field>
            <Field label="VIN" name="vin" error={errors.vin}>
              {(p) => <Input {...p} defaultValue={values.vin} className={`${input} uppercase`} />}
            </Field>
            <Field
              label="Status"
              name="status"
              error={errors.status}
              hint={
                statusLocked
                  ? 'This vehicle is rented. Close the rental to change its status.'
                  : 'Only available vehicles appear in the public fleet.'
              }
            >
              {(p) => (
                <select
                  {...p}
                  defaultValue={values.status}
                  disabled={statusLocked}
                  className={nativeSelectClass}
                >
                  {Object.entries(VEHICLE_STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <label className="flex items-center gap-2.5 self-center pt-5 text-sm">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={values.featured === 'on'}
                className="size-4 accent-[var(--brand)]"
              />
              Feature on the home page
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
