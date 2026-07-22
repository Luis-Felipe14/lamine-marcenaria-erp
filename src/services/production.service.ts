import { supabase } from '@/lib/supabase'
import { DEFAULT_PRODUCTION_CHECKLIST, type ProductionChecklistItem } from '@/lib/constants'
import { throwIfError } from '@/lib/supabase-helpers'

export interface ProductionOrder {
  id: string
  number: number
  order_id: string
  status: string
  start_date: string | null
  expected_end_date: string | null
  actual_end_date: string | null
  notes: string | null
  checklist: ProductionChecklistItem[] | null
  order?: { number: number; client?: { name: string } }
}

export interface OrderOption {
  id: string
  number: number
  notes: string | null
  client?: { name: string } | null
  budget?: { project_name: string } | null
}

export function parseChecklist(value: unknown): ProductionChecklistItem[] {
  if (!Array.isArray(value)) return DEFAULT_PRODUCTION_CHECKLIST.map((item) => ({ ...item }))
  return value
    .filter((item): item is ProductionChecklistItem =>
      Boolean(item && typeof item === 'object' && 'id' in item && 'label' in item))
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      done: Boolean(item.done),
    }))
}

export async function listProductionOrders(): Promise<ProductionOrder[]> {
  const { data, error } = await supabase
    .from('production_orders')
    .select(
      'id, number, order_id, status, start_date, expected_end_date, actual_end_date, notes, checklist, order:orders(number, client:clients(name))',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  throwIfError(error, 'ordens de produção')
  return (data ?? []).map((row) => {
    const orderJoined = (Array.isArray(row.order) ? row.order[0] : row.order) as
      | { number: number; client: { name: string } | { name: string }[] | null }
      | null
      | undefined

    let client: { name: string } | undefined
    if (orderJoined?.client) {
      const c = Array.isArray(orderJoined.client) ? orderJoined.client[0] : orderJoined.client
      if (c?.name) client = { name: String(c.name) }
    }

    return {
      id: row.id as string,
      number: row.number as number,
      order_id: row.order_id as string,
      status: row.status as string,
      start_date: row.start_date as string | null,
      expected_end_date: row.expected_end_date as string | null,
      actual_end_date: row.actual_end_date as string | null,
      notes: row.notes as string | null,
      checklist: parseChecklist(row.checklist),
      order: orderJoined
        ? { number: Number(orderJoined.number), client }
        : undefined,
    }
  })
}

export async function fetchActiveOrderOptions(): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, number, notes, client:clients(name), budget:budgets(project_name)')
    .in('status', ['projeto_desenvolvimento', 'aguardando_material', 'em_producao', 'pronto_entrega', 'em_montagem'])
    .is('deleted_at', null)
    .order('number', { ascending: false })

  throwIfError(error, 'pedidos ativos')
  return (data ?? []).map((o) => {
    const client = Array.isArray(o.client) ? o.client[0] : o.client
    const budget = Array.isArray(o.budget) ? o.budget[0] : o.budget
    return {
      id: o.id as string,
      number: o.number as number,
      notes: o.notes as string | null,
      client: (client ?? null) as OrderOption['client'],
      budget: (budget ?? null) as OrderOption['budget'],
    }
  })
}
