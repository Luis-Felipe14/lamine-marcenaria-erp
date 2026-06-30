export type UserRole = 'gestor' | 'secretaria' | 'producao'
export type TimeEntryType = 'producao' | 'hora_extra'
export type ReceiptType = 'recibo' | 'adiantamento'
export type MaterialUsageType = 'materia_prima' | 'consumo'

export type DepartmentType = 'gestao' | 'secretaria' | 'operacional'

export type LeadStatus =
  | 'novo_lead'
  | 'em_negociacao'
  | 'orcamento_enviado'
  | 'fechado'
  | 'perdido'

export type BudgetStatus =
  | 'em_analise'
  | 'enviado'
  | 'aprovado'
  | 'reprovado'
  | 'convertido_pedido'

export type OrderStatus =
  | 'projeto_desenvolvimento'
  | 'aguardando_material'
  | 'em_producao'
  | 'pronto_entrega'
  | 'em_montagem'
  | 'finalizado'
  | 'cancelado'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string | null
  role_id: string
  phone?: string | null
  is_active: boolean
  is_system_admin?: boolean
  role?: {
    name: UserRole
    label: string
    permissions: string[]
  }
  departments?: { id: string; name: DepartmentType; label: string }[]
}

export interface PaginationParams {
  page: number
  pageSize: number
  search?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
