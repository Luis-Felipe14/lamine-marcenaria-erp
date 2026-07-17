export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string
          avatar_url: string | null
          role_id: string
          phone: string | null
          is_active: boolean
          is_system_admin: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['users']['Row']> & {
          id: string
          email: string
          full_name: string
          role_id: string
        }
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      roles: {
        Row: {
          id: string
          name: string
          label: string
          permissions: Json
          created_at: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          document: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          address_street: string | null
          address_number: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          architect_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      architects: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          office: string | null
          commission_rate: number | null
          commission_type: string
          bank_info: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['architects']['Row'], 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<Database['public']['Tables']['architects']['Insert']>
      }
      leads: {
        Row: {
          id: string
          name: string
          phone: string | null
          whatsapp: string | null
          email: string | null
          origin: string | null
          campaign_id: string | null
          responsible_id: string | null
          architect_id: string | null
          estimated_value: number
          status: string
          notes: string | null
          client_id: string | null
          converted_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['leads']['Row']> & { name: string }
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      budgets: {
        Row: {
          id: string
          number: number
          client_id: string
          lead_id: string | null
          date: string
          environment: string | null
          project_name: string
          measurements: string | null
          labor_cost: number
          materials_cost: number
          discount: number
          total_value: number
          status: string
          notes: string | null
          commercial_terms: string | null
          entrada_percent: number
          entrada_mode: string
          entrada_value: number | null
          manufacturing_timeline: string | null
          installation_timeline: string | null
          proposal_template: string
          proposal_detail_mode: string
          responsible_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['budgets']['Row']> & {
          client_id: string
          project_name: string
        }
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
      }
      budget_items: {
        Row: {
          id: string
          budget_id: string
          environment_id: string | null
          description: string
          material: string | null
          quantity: number
          unit_price: number
          total_price: number
        }
        Insert: Omit<Database['public']['Tables']['budget_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['budget_items']['Insert']>
      }
      budget_environments: {
        Row: {
          id: string
          budget_id: string
          name: string
          sort_order: number
          subtotal: number
          description: string | null
          image_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['budget_environments']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['budget_environments']['Insert']>
      }
      orders: {
        Row: {
          id: string
          number: number
          client_id: string
          budget_id: string | null
          date: string
          deadline: string | null
          responsible_id: string | null
          value: number
          status: string
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & { client_id: string }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      production_orders: {
        Row: {
          id: string
          number: number
          order_id: string
          responsible_id: string | null
          planned_materials: Json
          start_date: string | null
          expected_end_date: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['production_orders']['Row']> & { order_id: string }
        Update: Partial<Database['public']['Tables']['production_orders']['Insert']>
      }
      materials: {
        Row: {
          id: string
          code: string | null
          name: string
          category: string
          usage_type: string
          unit: string
          specification: string | null
          brand: string | null
          supplier_id: string | null
          current_stock: number
          min_stock: number
          max_stock: number | null
          unit_cost: number
          last_purchase_price: number | null
          last_purchase_at: string | null
          location: string | null
          barcode: string | null
          image_url: string | null
          ncm: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['materials']['Row']> & { name: string }
        Update: Partial<Database['public']['Tables']['materials']['Insert']>
      }
      stock_movements: {
        Row: {
          id: string
          material_id: string
          movement_type: string
          quantity: number
          unit_cost: number | null
          department_id: string | null
          order_id: string | null
          responsible_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>
      }
      purchases: {
        Row: {
          id: string
          number: number
          supplier_id: string | null
          material_id: string | null
          description: string | null
          quantity: number
          unit_price: number
          total_price: number
          invoice_number: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['purchases']['Row']>
        Update: Partial<Database['public']['Tables']['purchases']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          name: string
          document: string | null
          phone: string | null
          email: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['suppliers']['Row']> & { name: string }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      financial_transactions: {
        Row: {
          id: string
          type: string
          category: string
          description: string
          amount: number
          due_date: string | null
          paid_date: string | null
          is_paid: boolean
          client_id: string | null
          order_id: string | null
          purchase_id: string | null
          employee_id: string | null
          payment_method: string | null
          notes: string | null
          supplier_id: string | null
          document_number: string | null
          installment_number: number | null
          installment_total: number | null
          is_installment_plan: boolean
          plan_total_amount: number | null
          cash_destination: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['financial_transactions']['Row']> & {
          type: string
          description: string
          amount: number
        }
        Update: Partial<Database['public']['Tables']['financial_transactions']['Insert']>
      }
      campaigns: {
        Row: {
          id: string
          name: string
          channel: string
          investment: number
          start_date: string
          end_date: string | null
          is_active: boolean
          notes: string | null
          provider_name: string | null
          payment_status: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['campaigns']['Row']> & { name: string; start_date: string }
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
      }
      employees: {
        Row: {
          id: string
          name: string
          position: string
          department_id: string | null
          phone: string | null
          cpf: string | null
          birth_date: string | null
          salary: number | null
          admission_date: string | null
          is_active: boolean
          user_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['employees']['Row']> & { name: string; position: string }
        Update: Partial<Database['public']['Tables']['employees']['Insert']>
      }
      employee_receipts: {
        Row: {
          id: string
          employee_id: string
          amount: number
          receipt_date: string
          reference_month: string
          receipt_type: string
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['employee_receipts']['Row']> & {
          employee_id: string
          amount: number
          reference_month: string
        }
        Update: Partial<Database['public']['Tables']['employee_receipts']['Insert']>
      }
      internal_requests: {
        Row: {
          id: string
          number: number
          requesting_department_id: string
          responsible_department_id: string
          priority: string
          status: string
          title: string
          description: string
          requested_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['internal_requests']['Row']> & {
          requesting_department_id: string
          responsible_department_id: string
          title: string
          description: string
        }
        Update: Partial<Database['public']['Tables']['internal_requests']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string
          title: string
          message: string
          entity_type: string | null
          entity_id: string | null
          is_read: boolean
          created_at: string
        }
      }
      settings: {
        Row: { id: string; key: string; value: Json }
      }
      lead_contact_history: {
        Row: {
          id: string
          lead_id: string
          user_id: string | null
          contact_type: string
          description: string
          contact_date: string
        }
        Insert: Omit<Database['public']['Tables']['lead_contact_history']['Row'], 'id'>
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          from_status: string | null
          to_status: string
          user_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_status_history']['Row'], 'id' | 'created_at'>
      }
    }
  }
}
