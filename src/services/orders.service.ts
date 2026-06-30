import { supabase } from '@/lib/supabase'
import { getBudgetStatusLabel, getOrderStatusLabel } from '@/lib/constants'
import { PRODUCTION_STATUSES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { throwIfError } from '@/lib/supabase-helpers'

export interface KanbanOrder {
  id: string
  number: number
  client_id: string
  status: string
  value: number
  deadline: string | null
  date: string
  notes: string | null
  client?: { name: string }
}

export async function fetchOrdersKanban(): Promise<KanbanOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, client:clients(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  throwIfError(error, 'pedidos')
  return (data ?? []) as KanbanOrder[]
}

export type OrderTimelineEventType =
  | 'budget'
  | 'order_created'
  | 'status_change'
  | 'production_order'

export interface OrderTimelineEvent {
  id: string
  type: OrderTimelineEventType
  title: string
  description?: string
  date: string
}

function productionStatusLabel(status: string): string {
  return PRODUCTION_STATUSES.find((s) => s.value === status)?.label ?? status
}

export async function getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
  const [{ data: order, error: orderError }, { data: history, error: historyError }, { data: ops, error: opsError }] =
    await Promise.all([
      supabase
        .from('orders')
        .select(`
          id, number, status, date, created_at, value,
          budget:budgets(id, number, project_name, status, date, approved_at, created_at)
        `)
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('order_status_history')
        .select('id, from_status, to_status, notes, created_at, user:users(full_name)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('production_orders')
        .select('id, number, status, start_date, expected_end_date, actual_end_date, created_at, notes')
        .eq('order_id', orderId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ])

  if (orderError) throw orderError
  if (historyError) throw historyError
  if (opsError) throw opsError
  if (!order) return []

  const events: OrderTimelineEvent[] = []

  const budget = Array.isArray(order.budget) ? order.budget[0] : order.budget
  if (budget) {
    events.push({
      id: `budget-${budget.id}`,
      type: 'budget',
      title: `Orçamento #${budget.number} — ${budget.project_name}`,
      description: `Status: ${getBudgetStatusLabel(budget.status)} · ${formatCurrency(order.value)}`,
      date: budget.approved_at ?? budget.created_at ?? budget.date,
    })
  }

  events.push({
    id: `order-${order.id}`,
    type: 'order_created',
    title: `Pedido #${order.number} criado`,
    description: `Status inicial: ${getOrderStatusLabel(order.status)}`,
    date: order.created_at ?? order.date,
  })

  for (const entry of history ?? []) {
    const user = Array.isArray(entry.user) ? entry.user[0] : entry.user
    const fromLabel = entry.from_status ? getOrderStatusLabel(entry.from_status) : null
    events.push({
      id: entry.id,
      type: 'status_change',
      title: fromLabel
        ? `${fromLabel} → ${getOrderStatusLabel(entry.to_status)}`
        : getOrderStatusLabel(entry.to_status),
      description: [entry.notes, user?.full_name ? `Por ${user.full_name}` : null].filter(Boolean).join(' · ') || undefined,
      date: entry.created_at,
    })
  }

  for (const op of ops ?? []) {
    events.push({
      id: `op-${op.id}`,
      type: 'production_order',
      title: `OP #${op.number} — ${productionStatusLabel(op.status)}`,
      description: [
        op.expected_end_date ? `Prazo: ${formatDate(op.expected_end_date)}` : null,
        op.notes?.trim() || null,
      ].filter(Boolean).join(' · ') || undefined,
      date: op.created_at,
    })
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
