import 'server-only'

import { daysUntil, paymentUrgencyFor, urgencyFor } from '@/lib/expiry'
import { lastDayOfMonth } from '@/lib/format'
import type {
  AdminDashboardStats,
  CustomerDocument,
  CustomerDocumentSummary,
  CustomerDocumentType,
  ExpiringVehicleDocument,
  Profile,
  Rental,
  RentalDue,
  RentalPayment,
  RentalAgreementView,
  RentalPlan,
  TermsVersion,
  Vehicle,
  VehicleCategory,
  VehicleDocument,
  VehicleDocumentType,
} from '@/lib/types/database'

/**
 * Dados do modo preview. Espelham o supabase/seed.sql -- mesmos veiculos,
 * categorias e tipos de documento -- mais alguns clientes ficticios para as
 * telas do admin terem o que mostrar. Datas sao relativas a hoje.
 */

const now = new Date()
const iso = now.toISOString()

function monthEnd(offsetMonths: number): string {
  return lastDayOfMonth(now.getFullYear(), now.getMonth() + 1 + offsetMonths)
}

function daysAgo(days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

export const fixtureCategories: VehicleCategory[] = [
  { slug: 'sedan', label: 'Sedan', sort_order: 1, is_active: true },
  { slug: 'hatchback', label: 'Hatchback', sort_order: 2, is_active: true },
  { slug: 'wagon', label: 'Wagon', sort_order: 3, is_active: true },
  { slug: 'suv', label: 'SUV', sort_order: 4, is_active: true },
  { slug: 'coupe', label: 'Coupe', sort_order: 5, is_active: true },
  { slug: 'convertible', label: 'Convertible', sort_order: 6, is_active: true },
  { slug: 'minivan', label: 'Minivan', sort_order: 7, is_active: true },
  { slug: 'pickup', label: 'Pickup Truck', sort_order: 8, is_active: true },
  { slug: 'van', label: 'Van', sort_order: 9, is_active: true },
]

export const fixtureVehicleDocumentTypes: VehicleDocumentType[] = [
  { slug: 'registration', label: 'Registration', requires_expiry: true, sort_order: 1, is_active: true },
]

export const fixtureCustomerDocumentTypes: CustomerDocumentType[] = [
  { slug: 'dl_front', label: "Driver's license (front)", is_required: true, requires_expiry: true, sort_order: 1, is_active: true },
  { slug: 'dl_back', label: "Driver's license (back)", is_required: true, requires_expiry: false, sort_order: 2, is_active: true },
  { slug: 'proof_of_address', label: 'Proof of address', is_required: true, requires_expiry: false, sort_order: 3, is_active: true },
]

type VehicleSeed = Omit<Vehicle, 'created_at' | 'updated_at' | 'doors' | 'vin'> & {
  doors: number
}

const vehicleSeeds: VehicleSeed[] = [
  { id: 'a0000000-0000-4000-8000-000000000001', make: 'Mercedes-Benz', model: 'S-Class', year: 2023, category_slug: 'sedan', transmission: 'automatic', fuel: 'gasoline', seats: 5, doors: 4, color: 'Black', mileage: 12400, plate: 'CAR-1001', weekly_rate: 1750, monthly_rate: 5900, security_deposit: 1500, status: 'available', featured: true, description: 'Full-size luxury sedan with premium leather interior and driver assistance package.' },
  { id: 'a0000000-0000-4000-8000-000000000002', make: 'BMW', model: 'X5', year: 2022, category_slug: 'suv', transmission: 'automatic', fuel: 'gasoline', seats: 5, doors: 5, color: 'Alpine White', mileage: 28750, plate: 'CAR-1002', weekly_rate: 1290, monthly_rate: 4400, security_deposit: 1000, status: 'rented', featured: true, description: 'Midsize luxury SUV, all-wheel drive, panoramic roof.' },
  { id: 'a0000000-0000-4000-8000-000000000003', make: 'Toyota', model: 'Camry', year: 2023, category_slug: 'sedan', transmission: 'automatic', fuel: 'hybrid', seats: 5, doors: 4, color: 'Silver', mileage: 19300, plate: 'CAR-1003', weekly_rate: 520, monthly_rate: 1750, security_deposit: 500, status: 'available', featured: false, description: 'Reliable hybrid sedan with excellent fuel economy. Great for long trips.' },
  { id: 'a0000000-0000-4000-8000-000000000004', make: 'Chevrolet', model: 'Tahoe', year: 2021, category_slug: 'suv', transmission: 'automatic', fuel: 'gasoline', seats: 7, doors: 5, color: 'Dark Gray', mileage: 54200, plate: 'CAR-1004', weekly_rate: 1050, monthly_rate: 3600, security_deposit: 800, status: 'rented', featured: false, description: 'Full-size SUV seating seven. Ideal for family trips and group travel.' },
  { id: 'a0000000-0000-4000-8000-000000000005', make: 'Tesla', model: 'Model 3', year: 2024, category_slug: 'sedan', transmission: 'automatic', fuel: 'electric', seats: 5, doors: 4, color: 'Deep Blue', mileage: 6100, plate: 'CAR-1005', weekly_rate: 760, monthly_rate: 2600, security_deposit: 700, status: 'available', featured: true, description: 'All-electric sedan with autopilot. Charging cable included.' },
  { id: 'a0000000-0000-4000-8000-000000000006', make: 'Volkswagen', model: 'Golf', year: 2022, category_slug: 'hatchback', transmission: 'automatic', fuel: 'gasoline', seats: 5, doors: 5, color: 'White', mileage: 41800, plate: 'CAR-1006', weekly_rate: 350, monthly_rate: 1200, security_deposit: 400, status: 'available', featured: false, description: 'Compact and economical. The best value in the fleet.' },
  { id: 'a0000000-0000-4000-8000-000000000007', make: 'Subaru', model: 'Outback', year: 2023, category_slug: 'wagon', transmission: 'automatic', fuel: 'gasoline', seats: 5, doors: 5, color: 'Autumn Green', mileage: 17600, plate: 'CAR-1007', weekly_rate: 690, monthly_rate: 2350, security_deposit: 600, status: 'maintenance', featured: false, description: 'All-wheel drive wagon with generous cargo space and roof rails.' },
  { id: 'a0000000-0000-4000-8000-000000000008', make: 'Chrysler', model: 'Pacifica', year: 2022, category_slug: 'minivan', transmission: 'automatic', fuel: 'hybrid', seats: 7, doors: 5, color: 'Modern Steel', mileage: 23900, plate: 'CAR-1008', weekly_rate: 820, monthly_rate: 2800, security_deposit: 700, status: 'rented', featured: false, description: 'Seven-seat minivan with sliding doors and flexible seating.' },
]

export const fixtureVehicles: Vehicle[] = vehicleSeeds.map((vehicle, index) => ({
  ...vehicle,
  vin: null,
  created_at: daysAgo(40 - index * 3),
  updated_at: iso,
}))

const registrationPlan: Array<[vehicleIndex: number, number: string, monthOffset: number]> = [
  [3, 'REG-4471', -1],
  [5, 'REG-8890', -2],
  [0, 'REG-1123', 0],
  [6, 'REG-7781', 0],
  [1, 'REG-2234', 1],
  [2, 'REG-3345', 1],
  [4, 'REG-5567', 2],
  [7, 'REG-8891', 9],
]

export const fixtureVehicleDocuments: VehicleDocument[] = registrationPlan.map(
  ([vehicleIndex, docNumber, monthOffset], index) => ({
    id: `b0000000-0000-4000-8000-00000000000${index + 1}`,
    vehicle_id: fixtureVehicles[vehicleIndex].id,
    type_slug: 'registration',
    doc_number: docNumber,
    issued_at: null,
    expires_at: monthEnd(monthOffset),
    file_path: null,
    notes: null,
    created_at: daysAgo(30),
    updated_at: iso,
  }),
)

export function fixtureExpiringDocuments(): ExpiringVehicleDocument[] {
  return fixtureVehicleDocuments
    .map((document) => {
      const vehicle = fixtureVehicles.find((item) => item.id === document.vehicle_id)!
      const days = daysUntil(document.expires_at!)
      return {
        id: document.id,
        vehicle_id: document.vehicle_id,
        type_slug: document.type_slug,
        type_label: 'Registration',
        doc_number: document.doc_number,
        issued_at: document.issued_at,
        expires_at: document.expires_at!,
        file_path: document.file_path,
        notes: document.notes,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        vehicle_status: vehicle.status,
        days_to_expire: days,
        urgency: urgencyFor(days),
      }
    })
    .sort((a, b) => a.days_to_expire - b.days_to_expire)
}

export const fixtureAdmin: Profile = {
  id: 'c0000000-0000-4000-8000-000000000000',
  role: 'admin',
  full_name: 'Preview Admin',
  email: 'admin@carental.preview',
  phone: null,
  notes: null,
  created_at: daysAgo(60),
  updated_at: iso,
}

export const fixtureCustomers: Profile[] = [
  { id: 'c0000000-0000-4000-8000-000000000001', role: 'customer', full_name: 'Jordan Miller', email: 'jordan.miller@example.com', phone: '(555) 010-2231', notes: null, created_at: daysAgo(2), updated_at: iso },
  { id: 'c0000000-0000-4000-8000-000000000002', role: 'customer', full_name: 'Ava Thompson', email: 'ava.thompson@example.com', phone: '(555) 010-8842', notes: null, created_at: daysAgo(9), updated_at: iso },
  { id: 'c0000000-0000-4000-8000-000000000003', role: 'customer', full_name: 'Daniel Reyes', email: 'daniel.reyes@example.com', phone: '(555) 010-4417', notes: null, created_at: daysAgo(16), updated_at: iso },
  { id: 'c0000000-0000-4000-8000-000000000004', role: 'customer', full_name: 'Sofia Nguyen', email: 'sofia.nguyen@example.com', phone: null, notes: null, created_at: daysAgo(23), updated_at: iso },
]

function customerDoc(
  id: number,
  profileIndex: number,
  typeSlug: string,
  status: CustomerDocument['status'],
  ageDays: number,
  notes: string | null = null,
): CustomerDocument {
  return {
    id: `d0000000-0000-4000-8000-00000000000${id}`,
    profile_id: fixtureCustomers[profileIndex].id,
    type_slug: typeSlug,
    file_path: `${fixtureCustomers[profileIndex].id}/${typeSlug}.jpg`,
    file_name: `${typeSlug}.jpg`,
    status,
    expires_at: typeSlug === 'dl_front' ? monthEnd(30) : null,
    notes,
    reviewed_by: status === 'pending' ? null : fixtureAdmin.id,
    reviewed_at: status === 'pending' ? null : daysAgo(ageDays - 1),
    created_at: daysAgo(ageDays),
    updated_at: iso,
  }
}

export const fixtureCustomerDocuments: CustomerDocument[] = [
  // Jordan: acabou de se cadastrar, tudo aguardando revisao
  customerDoc(1, 0, 'dl_front', 'pending', 2),
  customerDoc(2, 0, 'dl_back', 'pending', 2),
  customerDoc(3, 0, 'proof_of_address', 'pending', 2),
  // Ava: aprovada
  customerDoc(4, 1, 'dl_front', 'approved', 9),
  customerDoc(5, 1, 'dl_back', 'approved', 9),
  customerDoc(6, 1, 'proof_of_address', 'approved', 9),
  // Daniel: comprovante recusado
  customerDoc(7, 2, 'dl_front', 'approved', 16),
  customerDoc(8, 2, 'dl_back', 'approved', 16),
  customerDoc(9, 2, 'proof_of_address', 'rejected', 16, 'The bill is older than 90 days. Please upload a recent one.'),
  // Sofia: cadastro incompleto, sem nenhum documento
]

export function fixtureCustomerSummaries(): CustomerDocumentSummary[] {
  return fixtureCustomers.map((customer) => {
    const documents = fixtureCustomerDocuments.filter((doc) => doc.profile_id === customer.id)
    const requiredMissing = fixtureCustomerDocumentTypes.filter(
      (type) =>
        type.is_required &&
        !documents.some((doc) => doc.type_slug === type.slug && doc.status === 'approved'),
    ).length

    return {
      profile_id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      created_at: customer.created_at,
      documents_total: documents.length,
      documents_pending: documents.filter((doc) => doc.status === 'pending').length,
      documents_approved: documents.filter((doc) => doc.status === 'approved').length,
      documents_rejected: documents.filter((doc) => doc.status === 'rejected').length,
      required_missing: requiredMissing,
    }
  })
}

// ------------------------------------------------------------------ locacoes

function isoDate(offsetDays: number): string {
  const date = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

/** Uma cobranca atrasada, uma vencendo hoje e uma na semana. */
const rentalPlan: Array<[vehicleIndex: number, dueOffset: number, plan: RentalPlan, rate: number]> = [
  [3, -3, 'weekly', 1050],
  [1, 0, 'monthly', 4400],
  [7, 5, 'weekly', 820],
]

export const fixtureRentals: Rental[] = rentalPlan.map(([vehicleIndex, dueOffset, plan, rate], index) => ({
  id: `e0000000-0000-4000-8000-00000000000${index + 1}`,
  vehicle_id: fixtureVehicles[vehicleIndex].id,
  customer_id: index < 2 ? fixtureCustomers[index].id : null,
  renter_name: index < 2 ? null : 'Walk-in renter',
  plan,
  rate_amount: rate,
  deposit_amount: fixtureVehicles[vehicleIndex].security_deposit,
  started_on: isoDate(-30 - index * 10),
  next_due_on: isoDate(dueOffset),
  ended_on: null,
  status: 'active',
  notes: null,
  created_at: daysAgo(30 + index * 10),
  updated_at: iso,
}))

export function fixtureRentalDue(): RentalDue[] {
  return fixtureRentals
    .map((rental) => {
      const vehicle = fixtureVehicles.find((item) => item.id === rental.vehicle_id)!
      const customer = fixtureCustomers.find((item) => item.id === rental.customer_id)
      const days = daysUntil(rental.next_due_on)
      return {
        id: rental.id,
        vehicle_id: rental.vehicle_id,
        customer_id: rental.customer_id,
        renter: rental.renter_name ?? customer?.full_name ?? 'Unknown',
        plan: rental.plan,
        rate_amount: rental.rate_amount,
        deposit_amount: rental.deposit_amount,
        started_on: rental.started_on,
        next_due_on: rental.next_due_on,
        notes: rental.notes,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        days_to_due: days,
        urgency: paymentUrgencyFor(days),
        last_paid_on: isoDate(-7),
        total_paid: rental.rate_amount * 2,
      }
    })
    .sort((a, b) => a.days_to_due - b.days_to_due)
}

export const fixtureRentalPayments: RentalPayment[] = fixtureRentals.flatMap((rental, index) =>
  [1, 2].map((n) => ({
    id: `f000000${index}-0000-4000-8000-00000000000${n}`,
    rental_id: rental.id,
    amount: rental.rate_amount,
    paid_on: isoDate(-7 * n),
    covers_due_on: isoDate(-7 * n),
    notes: null,
    recorded_by: fixtureAdmin.id,
    created_at: daysAgo(7 * n),
  })),
)

export function fixtureDashboardStats(): AdminDashboardStats {
  const expiring = fixtureExpiringDocuments()
  const due = fixtureRentalDue()
  return {
    vehicles_total: fixtureVehicles.filter((v) => v.status !== 'archived').length,
    vehicles_available: fixtureVehicles.filter((v) => v.status === 'available').length,
    vehicles_rented: fixtureVehicles.filter((v) => v.status === 'rented').length,
    vehicles_maintenance: fixtureVehicles.filter((v) => v.status === 'maintenance').length,
    customers_total: fixtureCustomers.length,
    customer_docs_pending: fixtureCustomerDocuments.filter((d) => d.status === 'pending').length,
    vehicle_docs_expired: expiring.filter((d) => d.urgency === 'expired').length,
    vehicle_docs_expiring: expiring.filter((d) =>
      ['critical', 'warning', 'upcoming'].includes(d.urgency),
    ).length,
    rentals_active: fixtureRentals.length,
    payments_overdue: due.filter((d) => d.urgency === 'overdue').length,
    payments_due_soon: due.filter((d) => ['due_today', 'soon', 'upcoming'].includes(d.urgency)).length,
    agreements_pending: fixtureAgreements().filter((a) => a.status === 'pending').length,
  }
}

// ---------------------------------------------------------- termos e contratos

export const fixtureTerms: TermsVersion = {
  id: 'f1000000-0000-4000-8000-000000000001',
  version: 1,
  body: [
    'CARENTAL RENTAL AGREEMENT — SAMPLE TERMS',
    'This is sample text shown in preview mode. The admin publishes the real terms in Dashboard > Terms.',
    '1. The renter must hold a valid driver’s license for the entire rental period.',
    '2. A refundable security deposit is collected before the vehicle is released.',
    '3. The vehicle may only be driven within San Diego County.',
    '4. Insurance covers third-party liability only.',
  ].join('\n\n'),
  created_by: null,
  created_at: daysAgo(3),
}

/**
 * Um contrato pendente e um assinado, ligados as locacoes de clientes
 * cadastrados. O pendente fica com o cliente usado na area do cliente do
 * preview, para a tela de assinatura ter o que mostrar.
 */
export function fixtureAgreements(): RentalAgreementView[] {
  const due = fixtureRentalDue()
  return fixtureRentals
    .filter((rental) => rental.customer_id)
    .map((rental, index) => {
      const view = due.find((item) => item.id === rental.id)!
      const signed = index === 1
      const customer = fixtureCustomers.find((item) => item.id === rental.customer_id)
      return {
        id: `f2000000-0000-4000-8000-00000000000${index + 1}`,
        rental_id: rental.id,
        // O pendente e atribuido ao cliente que o preview usa na area do cliente.
        customer_id: signed ? rental.customer_id : fixtureCustomers[2].id,
        status: signed ? 'signed' : 'pending',
        signed_at: signed ? daysAgo(5) : null,
        signed_name: signed ? (customer?.full_name ?? null) : null,
        signer_ip: signed ? '203.0.113.24' : null,
        email_sent_at: signed ? daysAgo(5) : null,
        created_at: daysAgo(6),
        rental_snapshot: signed
          ? {
              vehicle: `${view.year} ${view.make} ${view.model}`,
              plate: view.plate,
              plan: rental.plan,
              rate_amount: rental.rate_amount,
              deposit_amount: rental.deposit_amount,
              started_on: rental.started_on,
              next_due_on: rental.next_due_on,
              renter: customer?.full_name ?? null,
            }
          : null,
        terms_version_id: signed ? fixtureTerms.id : null,
        terms_version: signed ? fixtureTerms.version : null,
        customer_name: signed ? (customer?.full_name ?? null) : fixtureCustomers[2].full_name,
        customer_email: signed ? (customer?.email ?? null) : fixtureCustomers[2].email,
        rental_status: rental.status,
        plan: rental.plan,
        rate_amount: rental.rate_amount,
        deposit_amount: rental.deposit_amount,
        started_on: rental.started_on,
        vehicle_id: rental.vehicle_id,
        vehicle_label: `${view.year} ${view.make} ${view.model}`,
      }
    })
}
