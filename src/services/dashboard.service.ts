import { supabase } from '@/lib/supabase'
import { BUDGET_WON_STATUSES } from '@/lib/constants'
import { getFinancialCategoryLabel } from '@/lib/constants'
import { throwIfError } from '@/lib/supabase-helpers'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { getInvestmentStats } from '@/services/marketing.service'
import { getLumberCreditBalance } from '@/services/lumberyard-credit.service'
import { getArchitectRankings } from '@/services/architects.service'
import { getFinancialSummary } from '@/services/financial.service'

const ACTIVE_ORDER_STATUSES = ['projeto_desenvolvimento', 'aguardando_material', 'em_producao', 'pronto_entrega', 'em_montagem']

async function sumFinancialAmountFallback(
  type: 'receita' | 'despesa',
  isPaid: boolean,
  dateFrom?: string,
  dateTo?: string,
  dueDateTo?: string,
  cashDestination?: string | null,
): Promise<number> {
  let q = supabase
    .from('financial_transactions')
    .select('amount')
    .eq('type', type)
    .eq('is_paid', isPaid)
    .is('deleted_at', null)
  if (dateFrom) q = q.gte('paid_date', dateFrom)
  if (dateTo) q = q.lte('paid_date', dateTo)
  if (dueDateTo) q = q.lte('due_date', dueDateTo)
  if (cashDestination) q = q.eq('cash_destination', cashDestination)
  const { data, error } = await q
  if (error) {
    console.warn('[Dashboard] sumFinancialAmount fallback:', error.message)
    return 0
  }
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
}

async function sumFinancialAmount(
  type: 'receita' | 'despesa',
  isPaid: boolean,
  dateFrom?: string,
  dateTo?: string,
  dueDateTo?: string,
  cashDestination?: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc('sum_financial_amount', {
    p_type: type,
    p_is_paid: isPaid,
    p_date_from: dateFrom ?? null,
    p_date_to: dateTo ?? null,
    p_due_date_to: dueDateTo ?? null,
    p_cash_destination: cashDestination ?? null,
  })

  if (error) {
    // Assinatura antiga ou RPC indisponível — tenta query direta
    console.warn('[Dashboard] sumFinancialAmount:', error.message)
    return sumFinancialAmountFallback(type, isPaid, dateFrom, dateTo, dueDateTo, cashDestination)
  }

  return Number(data) || 0
}

export async function countCriticalStock(): Promise<number> {
  const { data, error } = await supabase.rpc('count_critical_stock')
  if (error) return 0
  return Number(data) || 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countQuery(table: string, build: (q: any) => any, safe = false): Promise<number> {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  q = build(q)
  const { count, error } = await q
  if (error) {
    if (safe) return 0
    throwIfError(error, `count ${table}`)
  }
  return count ?? 0
}

export async function getExecutiveMetrics() {
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const today = format(now, 'yyyy-MM-dd')

  const [
    totalClients,
    totalLeads,
    totalBudgets,
    budgetsApproved,
    ordersInProduction,
    ordersLateData,
    materialsCritical,
    revenues,
    expenses,
  ] = await Promise.all([
    countQuery('clients', (q) => q.is('deleted_at', null)),
    countQuery('leads', (q) => q.is('deleted_at', null)),
    countQuery('budgets', (q) => q.is('deleted_at', null)),
    countQuery('budgets', (q) => q.in('status', [...BUDGET_WON_STATUSES]).is('deleted_at', null)),
    countQuery('orders', (q) => q.in('status', ['em_producao', 'aguardando_material']).is('deleted_at', null)),
    supabase.from('orders').select('id', { count: 'exact', head: true }).is('deleted_at', null).lt('deadline', today).in('status', ACTIVE_ORDER_STATUSES),
    countCriticalStock(),
    sumFinancialAmount('receita', true, monthStart, monthEnd, undefined, 'empresa'),
    sumFinancialAmount('despesa', true, monthStart, monthEnd),
  ])

  const [dailyRevenues, goalsSetting] = await Promise.all([
    sumFinancialAmount('receita', true, today, today, undefined, 'empresa'),
    supabase.from('settings').select('value').eq('key', 'goals').maybeSingle(),
  ])

  if (ordersLateData.error) console.warn('[Dashboard] orders late:', ordersLateData.error.message)

  const totalRevenue = typeof revenues === 'number' ? revenues : 0
  const totalExpense = typeof expenses === 'number' ? expenses : 0
  const criticalStock = typeof materialsCritical === 'number' ? materialsCritical : 0
  const dailyRevenue = typeof dailyRevenues === 'number' ? dailyRevenues : 0
  const goalsValue = goalsSetting.data?.value as {
    monthly_revenue_goal?: number
    monthly_goal_enabled?: boolean
  } | null
  const goalEnabled = goalsValue?.monthly_goal_enabled ?? Boolean(goalsValue?.monthly_revenue_goal)
  const monthlyGoal = goalsValue?.monthly_revenue_goal ?? Math.max(totalRevenue * 1.15, 50000)

  let marketingMonth = 0
  try {
    const invStats = await getInvestmentStats()
    marketingMonth = invStats.monthTotal
  } catch {
    marketingMonth = 0
  }

  return {
    totalClients,
    totalLeads,
    totalBudgets,
    budgetsApproved,
    ordersInProduction,
    ordersLate: ordersLateData.error ? 0 : (ordersLateData.count ?? 0),
    criticalStock,
    revenue: totalRevenue,
    expenses: totalExpense,
    balance: totalRevenue - totalExpense,
    dailyRevenue,
    monthlyGoal,
    goalEnabled,
    goalProgress: goalEnabled && monthlyGoal > 0 ? (totalRevenue / monthlyGoal) * 100 : 0,
    marketingMonth,
  }
}

export interface SidebarBadges {
  [path: string]: number
}

export async function getSidebarBadges(): Promise<SidebarBadges> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [leads, ordersLate, critical, openRequests] = await Promise.all([
    countQuery('leads', (q) =>
      q.is('deleted_at', null).in('status', ['novo_lead', 'em_negociacao', 'orcamento_enviado']),
      true
    ),
    supabase.from('orders').select('id', { count: 'exact', head: true }).is('deleted_at', null).lt('deadline', today).in('status', ACTIVE_ORDER_STATUSES),
    countCriticalStock(),
    countQuery('internal_requests', (q) => q.in('status', ['aberta', 'em_andamento']).is('deleted_at', null), true),
  ])

  const criticalCount = typeof critical === 'number' ? critical : 0

  return {
    '/crm': leads,
    '/pedidos': ordersLate.count ?? 0,
    '/estoque': criticalCount,
    '/solicitacoes': openRequests,
  }
}

export async function getFinancialChart(months = 6) {
  const startDate = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('financial_transactions')
    .select('type, amount, paid_date, cash_destination')
    .eq('is_paid', true)
    .gte('paid_date', startDate)
    .lte('paid_date', endDate)
    .is('deleted_at', null)

  throwIfError(error, 'financial chart')

  const buckets = new Map<string, { month: string; receitas: number; despesas: number }>()
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    const key = format(date, 'yyyy-MM')
    buckets.set(key, { month: format(date, 'MMM/yy'), receitas: 0, despesas: 0 })
  }

  for (const row of data ?? []) {
    if (!row.paid_date) continue
    if (row.type === 'receita' && row.cash_destination === 'madeireira') continue
    const key = row.paid_date.slice(0, 7)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (row.type === 'receita') bucket.receitas += Number(row.amount)
    else if (row.type === 'despesa') bucket.despesas += Number(row.amount)
  }

  return [...buckets.values()]
}

export async function getCommercialMetrics() {
  const [leadsReceived, budgetsSent, approvedRes, architectRanking] = await Promise.all([
    countQuery('leads', (q) => q.is('deleted_at', null)),
    countQuery('budgets', (q) => q.eq('status', 'enviado').is('deleted_at', null)),
    supabase.from('budgets').select('id, total_value, responsible_id').in('status', [...BUDGET_WON_STATUSES]).is('deleted_at', null),
    getArchitectRankings().catch(() => []),
  ])

  throwIfError(approvedRes.error, 'approved budgets')

  const approvedData = approvedRes.data ?? []
  const soldValue = approvedData.reduce((s, b) => s + Number(b.total_value), 0)
  const conversionRate = leadsReceived ? (approvedData.length / leadsReceived) * 100 : 0

  const responsibleIds = [...new Set(approvedData.map((b) => b.responsible_id).filter(Boolean))] as string[]
  const nameMap = new Map<string, string>()

  if (responsibleIds.length > 0) {
    const { data: users, error } = await supabase.from('users').select('id, full_name').in('id', responsibleIds)
    throwIfError(error, 'seller names')
    for (const u of users ?? []) nameMap.set(u.id, u.full_name)
  }

  const sellerMap = new Map<string, { name: string; total: number }>()
  for (const b of approvedData) {
    const id = b.responsible_id ?? 'unknown'
    const existing = sellerMap.get(id) ?? { name: nameMap.get(id) ?? 'Sem responsável', total: 0 }
    existing.total += Number(b.total_value)
    sellerMap.set(id, existing)
  }

  return {
    leadsReceived,
    budgetsSent,
    budgetsApproved: approvedData.length,
    conversionRate,
    soldValue,
    sellerRanking: [...sellerMap.values()].sort((a, b) => b.total - a.total),
    architectRanking,
  }
}

export async function getOperationalMetrics(options?: { includeLumberCredit?: boolean }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const includeLumberCredit = options?.includeLumberCredit !== false

  const [openOrders, inProgress, lateData, pendingDeliveries, lumberCreditBalance] = await Promise.all([
    countQuery('production_orders', (q) => q.eq('status', 'aberta').is('deleted_at', null)),
    countQuery('production_orders', (q) => q.eq('status', 'em_andamento').is('deleted_at', null)),
    supabase.from('production_orders').select('id').lt('expected_end_date', today).neq('status', 'concluida').is('deleted_at', null),
    countQuery('orders', (q) => q.in('status', ['pronto_entrega', 'em_montagem']).is('deleted_at', null)),
    includeLumberCredit ? getLumberCreditBalance().catch(() => 0) : Promise.resolve(0),
  ])

  throwIfError(lateData.error, 'late production')

  return {
    openOrders,
    inProgress,
    late: lateData.data?.length ?? 0,
    pendingDeliveries,
    lumberCreditBalance,
  }
}


export async function getFinancialDashboardMetrics() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [accountsPayable, accountsReceivable, cashFlow] = await Promise.all([
    sumFinancialAmount('despesa', false, undefined, undefined, today),
    sumFinancialAmount('receita', false),
    supabase
      .from('financial_transactions')
      .select('type, amount, category, cash_destination')
      .eq('is_paid', true)
      .gte('paid_date', monthStart)
      .is('deleted_at', null),
  ])

  throwIfError(cashFlow.error, 'cash flow')

  const cashRows = cashFlow.data ?? []

  return {
    accountsPayable,
    accountsReceivable,
    expensesByCategory: groupByCategory(cashRows, 'despesa'),
    monthlyResult: calculateMonthlyResult(cashRows),
  }
}

function groupByCategory(data: { type: string; amount: number; category: string }[], type: string) {
  const map = new Map<string, number>()
  for (const item of data.filter((d) => d.type === type)) {
    const label = getFinancialCategoryLabel(item.category)
    map.set(label, (map.get(label) ?? 0) + Number(item.amount))
  }
  return [...map.entries()].map(([category, total]) => ({ category, total }))
}

function calculateMonthlyResult(data: { type: string; amount: number; cash_destination?: string | null }[]) {
  const revenue = data
    .filter((d) => d.type === 'receita' && d.cash_destination !== 'madeireira')
    .reduce((s, d) => s + Number(d.amount), 0)
  const expense = data.filter((d) => d.type === 'despesa').reduce((s, d) => s + Number(d.amount), 0)
  return revenue - expense
}

export interface GlobalHeaderMetrics {
  monthlyRevenue: number
  activeOrders: number
  accountsReceivable: number
  criticalStock: number
}

export async function getGlobalHeaderMetrics(): Promise<GlobalHeaderMetrics> {
  // Receita / A receber: mesmos totais do resumo do Financeiro (não só o mês corrente)
  const [summary, activeOrders, criticalStock] = await Promise.all([
    getFinancialSummary().catch((err) => {
      console.warn('[Dashboard] getFinancialSummary no header:', err)
      return { receitas: 0, despesas: 0, aPagar: 0, aReceber: 0 }
    }),
    countQuery('orders', (q) => q.in('status', ACTIVE_ORDER_STATUSES).is('deleted_at', null), true),
    countCriticalStock(),
  ])

  return {
    monthlyRevenue: summary.receitas,
    activeOrders,
    accountsReceivable: summary.aReceber,
    criticalStock: typeof criticalStock === 'number' ? criticalStock : 0,
  }
}

export interface ActivityItem {
  id: string
  type: 'lead' | 'order' | 'budget' | 'client' | 'production' | 'financial'
  title: string
  description: string
  created_at: string
  link: string
}

export async function getRecentActivities(limit = 12): Promise<ActivityItem[]> {
  const [leads, orders, budgets, clients, production] = await Promise.all([
    supabase.from('leads').select('id, name, status, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('orders').select('id, number, status, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('budgets').select('id, number, project_name, status, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('clients').select('id, name, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('production_orders').select('id, number, status, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
  ])

  const items: ActivityItem[] = []

  for (const l of leads.data ?? []) {
    items.push({ id: `lead-${l.id}`, type: 'lead', title: 'Novo lead', description: l.name, created_at: l.created_at, link: '/crm' })
  }
  for (const o of orders.data ?? []) {
    items.push({ id: `order-${o.id}`, type: 'order', title: `Pedido #${o.number}`, description: o.status, created_at: o.created_at, link: '/pedidos' })
  }
  for (const b of budgets.data ?? []) {
    items.push({ id: `budget-${b.id}`, type: 'budget', title: `Orçamento #${b.number}`, description: b.project_name, created_at: b.created_at, link: '/orcamentos' })
  }
  for (const c of clients.data ?? []) {
    items.push({ id: `client-${c.id}`, type: 'client', title: 'Cliente cadastrado', description: c.name, created_at: c.created_at, link: '/clientes' })
  }
  for (const p of production.data ?? []) {
    items.push({ id: `prod-${p.id}`, type: 'production', title: `OP #${p.number}`, description: p.status, created_at: p.created_at, link: '/producao' })
  }

  return items
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(10)
  throwIfError(error, 'notifications')
  return data ?? []
}
