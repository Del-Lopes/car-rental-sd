/**
 * Tipos do banco.
 *
 * Escritos a mao no Sprint 0 porque ainda nao existe projeto Supabase criado.
 * Assim que o projeto estiver no ar, rode `npm run db:types` para regerar este
 * arquivo a partir do schema real e manter as duas pontas em sincronia.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'customer'
export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'archived'
export type DocumentStatus = 'pending' | 'approved' | 'rejected'
export type Transmission = 'automatic' | 'manual'
export type Fuel = 'gasoline' | 'diesel' | 'hybrid' | 'electric'

/** Faixas do semaforo do dashboard de vencimentos (view v_expiring_vehicle_documents). */
export type DocumentUrgency = 'expired' | 'critical' | 'warning' | 'upcoming' | 'ok'

export type RentalPlan = 'weekly' | 'monthly'
export type RentalStatus = 'active' | 'closed'
export type AgreementStatus = 'pending' | 'signed'

/** Dados do aluguel congelados no momento da assinatura do contrato. */
export type RentalSnapshot = {
  vehicle: string
  plate: string | null
  plan: RentalPlan
  rate_amount: number
  deposit_amount: number | null
  started_on: string
  next_due_on: string
  renter: string | null
}

/** Faixas do semaforo das cobrancas (view v_rental_due). */
export type PaymentUrgency = 'overdue' | 'due_today' | 'soon' | 'upcoming' | 'ok'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string | null
          email: string | null
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          full_name?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
        }
        Update: {
          role?: UserRole
          full_name?: string | null
          email?: string | null
          phone?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          make: string
          model: string
          year: number
          category_slug: string
          transmission: Transmission
          fuel: Fuel | null
          seats: number | null
          doors: number | null
          color: string | null
          mileage: number | null
          plate: string | null
          vin: string | null
          weekly_rate: number
          monthly_rate: number
          security_deposit: number | null
          status: VehicleStatus
          description: string | null
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          make: string
          model: string
          year: number
          category_slug: string
          transmission: Transmission
          fuel?: Fuel | null
          seats?: number | null
          doors?: number | null
          color?: string | null
          mileage?: number | null
          plate?: string | null
          vin?: string | null
          weekly_rate: number
          monthly_rate: number
          security_deposit?: number | null
          status?: VehicleStatus
          description?: string | null
          featured?: boolean
        }
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>
        Relationships: []
      }
      vehicle_photos: {
        Row: {
          id: string
          vehicle_id: string
          storage_path: string
          alt_text: string | null
          sort_order: number
          is_cover: boolean
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          storage_path: string
          alt_text?: string | null
          sort_order?: number
          is_cover?: boolean
        }
        Update: Partial<Database['public']['Tables']['vehicle_photos']['Insert']>
        Relationships: []
      }
      vehicle_documents: {
        Row: {
          id: string
          vehicle_id: string
          type_slug: string
          doc_number: string | null
          issued_at: string | null
          expires_at: string | null
          file_path: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          type_slug: string
          doc_number?: string | null
          issued_at?: string | null
          expires_at?: string | null
          file_path?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['vehicle_documents']['Insert']>
        Relationships: []
      }
      customer_documents: {
        Row: {
          id: string
          profile_id: string
          type_slug: string
          file_path: string
          file_name: string | null
          status: DocumentStatus
          expires_at: string | null
          notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type_slug: string
          file_path: string
          file_name?: string | null
          status?: DocumentStatus
          expires_at?: string | null
          notes?: string | null
        }
        Update: {
          status?: DocumentStatus
          notes?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: { slug: string; label: string; sort_order: number; is_active: boolean }
        Insert: { slug: string; label: string; sort_order?: number; is_active?: boolean }
        Update: Partial<{ label: string; sort_order: number; is_active: boolean }>
        Relationships: []
      }
      vehicle_document_types: {
        Row: {
          slug: string
          label: string
          requires_expiry: boolean
          sort_order: number
          is_active: boolean
        }
        Insert: {
          slug: string
          label: string
          requires_expiry?: boolean
          sort_order?: number
          is_active?: boolean
        }
        Update: Partial<{
          label: string
          requires_expiry: boolean
          sort_order: number
          is_active: boolean
        }>
        Relationships: []
      }
      terms_versions: {
        Row: {
          id: string
          version: number
          body: string
          created_by: string | null
          created_at: string
        }
        // Versao, autor e data sao definidos pelo banco.
        Insert: { body: string }
        Update: Record<PropertyKey, never>
        Relationships: []
      }
      rental_agreements: {
        Row: {
          id: string
          rental_id: string
          customer_id: string | null
          status: AgreementStatus
          terms_version_id: string | null
          rental_snapshot: RentalSnapshot | null
          signed_name: string | null
          signed_at: string | null
          signer_ip: string | null
          signer_user_agent: string | null
          email_sent_at: string | null
          created_at: string
        }
        // Criado por trigger e assinado por funcao: a API nao grava direto.
        Insert: Record<PropertyKey, never>
        Update: { email_sent_at?: string | null }
        Relationships: []
      }
      rentals: {
        Row: {
          id: string
          vehicle_id: string
          customer_id: string | null
          renter_name: string | null
          plan: RentalPlan
          rate_amount: number
          deposit_amount: number | null
          started_on: string
          next_due_on: string
          ended_on: string | null
          status: RentalStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          customer_id?: string | null
          renter_name?: string | null
          plan: RentalPlan
          rate_amount: number
          deposit_amount?: number | null
          started_on?: string
          next_due_on: string
          ended_on?: string | null
          status?: RentalStatus
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['rentals']['Insert']>
        Relationships: []
      }
      rental_payments: {
        Row: {
          id: string
          rental_id: string
          amount: number
          paid_on: string
          covers_due_on: string | null
          notes: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rental_id: string
          amount: number
          paid_on?: string
          covers_due_on?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['rental_payments']['Insert']>
        Relationships: []
      }
      customer_document_types: {
        Row: {
          slug: string
          label: string
          is_required: boolean
          requires_expiry: boolean
          sort_order: number
          is_active: boolean
        }
        Insert: {
          slug: string
          label: string
          is_required?: boolean
          requires_expiry?: boolean
          sort_order?: number
          is_active?: boolean
        }
        Update: Partial<{
          label: string
          is_required: boolean
          requires_expiry: boolean
          sort_order: number
          is_active: boolean
        }>
        Relationships: []
      }
    }
    Views: {
      v_expiring_vehicle_documents: {
        Row: {
          id: string
          vehicle_id: string
          type_slug: string
          type_label: string
          doc_number: string | null
          issued_at: string | null
          expires_at: string
          file_path: string | null
          notes: string | null
          make: string
          model: string
          year: number
          plate: string | null
          vehicle_status: VehicleStatus
          days_to_expire: number
          urgency: DocumentUrgency
        }
        Relationships: []
      }
      v_admin_dashboard_stats: {
        Row: {
          vehicles_total: number
          vehicles_available: number
          vehicles_rented: number
          vehicles_maintenance: number
          customers_total: number
          customer_docs_pending: number
          vehicle_docs_expired: number
          vehicle_docs_expiring: number
          rentals_active: number
          payments_overdue: number
          payments_due_soon: number
          agreements_pending: number
        }
        Relationships: []
      }
      v_current_terms: {
        Row: {
          id: string
          version: number
          body: string
          created_by: string | null
          created_at: string
        }
        Relationships: []
      }
      v_rental_agreements: {
        Row: {
          id: string
          rental_id: string
          customer_id: string | null
          status: AgreementStatus
          signed_at: string | null
          signed_name: string | null
          signer_ip: string | null
          email_sent_at: string | null
          created_at: string
          rental_snapshot: RentalSnapshot | null
          terms_version_id: string | null
          terms_version: number | null
          customer_name: string | null
          customer_email: string | null
          rental_status: RentalStatus
          plan: RentalPlan
          rate_amount: number
          deposit_amount: number | null
          started_on: string
          vehicle_id: string
          vehicle_label: string
        }
        Relationships: []
      }
      v_rental_due: {
        Row: {
          id: string
          vehicle_id: string
          customer_id: string | null
          renter: string
          plan: RentalPlan
          rate_amount: number
          deposit_amount: number | null
          started_on: string
          next_due_on: string
          notes: string | null
          make: string
          model: string
          year: number
          plate: string | null
          days_to_due: number
          urgency: PaymentUrgency
          last_paid_on: string | null
          total_paid: number
        }
        Relationships: []
      }
      v_customer_document_summary: {
        Row: {
          profile_id: string
          full_name: string | null
          email: string | null
          phone: string | null
          created_at: string
          documents_total: number
          documents_pending: number
          documents_approved: number
          documents_rejected: number
          required_missing: number
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      sign_rental_agreement: {
        Args: {
          p_agreement_id: string
          p_customer_id: string
          p_terms_version_id: string
          p_signed_name: string
          p_ip: string
          p_user_agent: string
        }
        Returns: Database['public']['Tables']['rental_agreements']['Row']
      }
      register_rental_payment: {
        Args: { p_rental_id: string; p_amount?: number | null; p_paid_on?: string }
        Returns: Database['public']['Tables']['rentals']['Row']
      }
    }
    Enums: {
      user_role: UserRole
      vehicle_status: VehicleStatus
      document_status: DocumentStatus
    }
    CompositeTypes: Record<PropertyKey, never>
  }
}

type PublicSchema = Database['public']

export type Profile = PublicSchema['Tables']['profiles']['Row']
export type Vehicle = PublicSchema['Tables']['vehicles']['Row']
export type VehiclePhoto = PublicSchema['Tables']['vehicle_photos']['Row']
export type VehicleDocument = PublicSchema['Tables']['vehicle_documents']['Row']
export type CustomerDocument = PublicSchema['Tables']['customer_documents']['Row']
export type VehicleCategory = PublicSchema['Tables']['vehicle_categories']['Row']
export type VehicleDocumentType = PublicSchema['Tables']['vehicle_document_types']['Row']
export type CustomerDocumentType = PublicSchema['Tables']['customer_document_types']['Row']

export type ExpiringVehicleDocument = PublicSchema['Views']['v_expiring_vehicle_documents']['Row']
export type TermsVersion = PublicSchema['Tables']['terms_versions']['Row']
export type RentalAgreement = PublicSchema['Tables']['rental_agreements']['Row']
export type RentalAgreementView = PublicSchema['Views']['v_rental_agreements']['Row']
export type Rental = PublicSchema['Tables']['rentals']['Row']
export type RentalPayment = PublicSchema['Tables']['rental_payments']['Row']
export type RentalDue = PublicSchema['Views']['v_rental_due']['Row']
export type AdminDashboardStats = PublicSchema['Views']['v_admin_dashboard_stats']['Row']
export type CustomerDocumentSummary = PublicSchema['Views']['v_customer_document_summary']['Row']

/** Veiculo com as fotos embutidas, formato usado no feed e na pagina de detalhe. */
export type VehicleWithPhotos = Vehicle & {
  vehicle_photos: VehiclePhoto[]
  vehicle_categories: Pick<VehicleCategory, 'slug' | 'label'> | null
}
