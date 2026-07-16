import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'
import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'

const TRANSACTION_SELECT =
  'id, type, category, description, amount, due_date, is_paid, paid_date, client_id, order_id, purchase_id, employee_id, payment_method, notes, supplier_id, document_number, installment_number, installment_total, client:clients(name), order:orders(number), purchase:purchases(number, description, supplier_id, invoice_number), supplier:suppliers(name), employee:employees(name, position)'

export interface FinancialTransaction {
  id: string
  type: string
  category: string
  description: string
  amount: number
  due_date: string | null
  is_paid: boolean
  paid_date: string | null
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
  client?: { name: string } | null
  order?: { number: number } | null
  purchase?: { number: number; description: string | null; supplier_id: string | null; invoice_number: string | null } | null
  supplier?: { name: string } | null
  employee?: { name: string; position: string | null } | null
}

export interface FinancialSummary {
  receitas: number
  despesas: number
  aPagar: number
  aReceber: number
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const { data, error } = await supabase.rpc('get_financial_summary')

  throwIfError(error, 'resumo financeiro')
  const row = Array.isArray(data) ? data[0] : data

  return {
    receitas: Number(row?.receitas) || 0,
    despesas: Number(row?.despesas) || 0,
    aPagar: Number(row?.a_pagar) || 0,
    aReceber: Number(row?.a_receber) || 0,
  }
}

export async function listFinancialTransactions(
  page: number,
  filter: 'all' | 'receita' | 'despesa' = 'all',
  pageSize = PAGE_SIZE
) {
  return paginatedQuery<FinancialTransaction>(
    'financial_transactions',
    { page, pageSize },
    {
      select: TRANSACTION_SELECT,
      orderBy: { column: 'due_date', ascending: true },
      filters: (q) => (filter === 'all' ? q : q.eq('type', filter)),
    }
  )
}

export interface FinancialSettings {
  /** Quando true, a secretária vê o resumo (Receitas/Despesas pagas e pendentes). */
  secretary_can_view_summary: boolean
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  secretary_can_view_summary: false,
}

export async function getFinancialSettings(): Promise<FinancialSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'financial')
    .maybeSingle()

  throwIfError(error, 'configurações financeiras')
  const value = data?.value as Partial<FinancialSettings> | undefined
  return {
    secretary_can_view_summary:
      value?.secretary_can_view_summary ?? DEFAULT_FINANCIAL_SETTINGS.secretary_can_view_summary,
  }
}

export async function saveFinancialSettings(settings: FinancialSettings): Promise<void> {
  const { data: existing, error: loadError } = await supabase
    .from('settings')
    .select('id')
    .eq('key', 'financial')
    .maybeSingle()

  throwIfError(loadError, 'configurações financeiras')

  const payload = {
    key: 'financial',
    value: settings,
  }

  const { error } = existing
    ? await supabase.from('settings').update({ value: payload.value }).eq('key', 'financial')
    : await supabase.from('settings').insert(payload)

  throwIfError(error, 'salvar configurações financeiras')
}
