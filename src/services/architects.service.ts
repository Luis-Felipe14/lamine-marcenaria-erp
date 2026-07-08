import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'
import { BUDGET_WON_STATUSES } from '@/lib/constants'

export type ArchitectCommissionType = 'percent_sale' | 'fixed'

export interface Architect {
  id: string
  name: string
  phone: string | null
  email: string | null
  office: string | null
  commission_rate: number | null
  commission_type: ArchitectCommissionType
  bank_info: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface ArchitectPayload {
  name: string
  phone?: string | null
  email?: string | null
  office?: string | null
  commission_rate?: number | null
  commission_type?: ArchitectCommissionType
  bank_info?: string | null
  notes?: string | null
  is_active?: boolean
}

export interface ArchitectRankingRow {
  architect_id: string
  name: string
  projectCount: number
  soldValue: number
}

export async function listArchitectsPaginated(page: number, search = '', pageSize = PAGE_SIZE) {
  return paginatedQuery<Architect>(
    'architects',
    { page, pageSize, search },
    {
      searchColumns: ['name', 'phone', 'email', 'office'],
      orderBy: { column: 'name', ascending: true },
    },
  )
}

export async function createArchitect(payload: ArchitectPayload): Promise<Architect> {
  const { data, error } = await supabase
    .from('architects')
    .insert({
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      office: payload.office?.trim() || null,
      commission_rate: payload.commission_rate ?? null,
      commission_type: payload.commission_type ?? 'percent_sale',
      bank_info: payload.bank_info?.trim() || null,
      notes: payload.notes?.trim() || null,
      is_active: payload.is_active ?? true,
    })
    .select('*')
    .single()

  throwIfError(error, 'criar arquiteto')
  return data as Architect
}

export async function getArchitectRankings(): Promise<ArchitectRankingRow[]> {
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select(`
      id,
      total_value,
      client:clients(architect_id, architect:architects(id, name)),
      lead:leads(architect_id, architect:architects(id, name))
    `)
    .in('status', [...BUDGET_WON_STATUSES])
    .is('deleted_at', null)

  throwIfError(error, 'ranking de arquitetos')

  type BudgetRow = {
    id: string
    total_value: number
    client?: {
      architect_id: string | null
      architect?: { id: string; name: string } | null
    } | null
    lead?: {
      architect_id: string | null
      architect?: { id: string; name: string } | null
    } | null
  }

  const rankingMap = new Map<string, ArchitectRankingRow>()

  for (const row of (budgets ?? []) as unknown as BudgetRow[]) {
    const client = Array.isArray(row.client) ? row.client[0] : row.client
    const lead = Array.isArray(row.lead) ? row.lead[0] : row.lead
    const architect = client?.architect ?? lead?.architect
    const architectData = Array.isArray(architect) ? architect[0] : architect
    if (!architectData) continue

    const existing = rankingMap.get(architectData.id) ?? {
      architect_id: architectData.id,
      name: architectData.name,
      projectCount: 0,
      soldValue: 0,
    }
    existing.projectCount += 1
    existing.soldValue += Number(row.total_value) || 0
    rankingMap.set(architectData.id, existing)
  }

  return [...rankingMap.values()].sort((a, b) => b.soldValue - a.soldValue)
}

export function formatArchitectCommission(architect: Pick<Architect, 'commission_rate' | 'commission_type'>): string {
  if (architect.commission_rate == null) return '—'
  if (architect.commission_type === 'fixed') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(architect.commission_rate)
  }
  return `${architect.commission_rate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}
