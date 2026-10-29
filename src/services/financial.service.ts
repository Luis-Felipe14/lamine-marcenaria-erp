import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'
import { PAGE_SIZE, SELECT_NONE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import { buildEqualInstallmentSchedule, shiftDueDateByMonths } from '@/lib/financial-installments'
import { endOfMonth, format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

const TRANSACTION_SELECT =
  'id, type, category, description, amount, due_date, is_paid, paid_date, client_id, order_id, purchase_id, employee_id, payment_method, notes, supplier_id, document_number, installment_number, installment_total, cash_destination, is_installment_plan, plan_total_amount, is_order_balance, balance_original_amount, balance_transaction_id, client:clients(name), order:orders(number), purchase:purchases(number, description, supplier_id, invoice_number), supplier:suppliers(name), employee:employees(name, position)'

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
  cash_destination: string
  is_installment_plan: boolean
  plan_total_amount: number | null
  is_order_balance: boolean
  balance_original_amount: number | null
  balance_transaction_id: string | null
  client?: { name: string } | null
  order?: { number: number } | null
  purchase?: { number: number; description: string | null; supplier_id: string | null; invoice_number: string | null } | null
  supplier?: { name: string } | null
  employee?: { name: string; position: string | null } | null
}

export interface FinancialInstallmentSchedule {
  id: string
  transaction_id: string
  installment_number: number
  amount: number
  due_date: string
  is_paid: boolean
  paid_date: string | null
}

export interface FinancialSummary {
  receitas: number
  despesas: number
  aPagar: number
  aReceber: number
}

export interface FinancialTransactionFilters {
  type: 'all' | 'receita' | 'despesa'
  paymentMethod: string
  year: number | 'all'
  month: number | 'all'
}

export function createDefaultFinancialTransactionFilters(): FinancialTransactionFilters {
  return {
    type: 'all',
    paymentMethod: 'all',
    year: new Date().getFullYear(),
    month: 'all',
  }
}

export function isDefaultFinancialTransactionFilters(filters: FinancialTransactionFilters): boolean {
  const defaults = createDefaultFinancialTransactionFilters()
  return (
    filters.type === defaults.type
    && filters.paymentMethod === defaults.paymentMethod
    && filters.year === defaults.year
    && filters.month === defaults.month
  )
}

function applyFinancialTransactionFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: FinancialTransactionFilters,
) {
  let q = query

  if (filters.type !== 'all') {
    q = q.eq('type', filters.type)
  }

  if (filters.paymentMethod !== 'all') {
    q = filters.paymentMethod === SELECT_NONE
      ? q.is('payment_method', null)
      : q.eq('payment_method', filters.paymentMethod)
  }

  if (filters.year !== 'all') {
    if (filters.month === 'all') {
      q = q.gte('due_date', `${filters.year}-01-01`).lte('due_date', `${filters.year}-12-31`)
    } else {
      const start = format(new Date(filters.year, filters.month - 1, 1), 'yyyy-MM-dd')
      const end = format(endOfMonth(new Date(filters.year, filters.month - 1, 1)), 'yyyy-MM-dd')
      q = q.gte('due_date', start).lte('due_date', end)
    }
  }

  // Saldos de pedido ficam na área própria; só saldos já confirmados como recebidos seguem na tabela
  q = q.or('is_order_balance.eq.false,and(is_paid.eq.true,amount.gt.0)')

  return q
}

export async function listOpenOrderBalances(): Promise<FinancialTransaction[]> {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select(TRANSACTION_SELECT)
    .eq('is_order_balance', true)
    .eq('is_paid', false)
    .gt('amount', 0)
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })

  throwIfError(error, 'saldos dos pedidos')
  return (data ?? []) as unknown as FinancialTransaction[]
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export interface OrderBalanceRef {
  id: string
  amount: number
}

async function findOpenOrderBalance(orderId: string): Promise<OrderBalanceRef | null> {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('id, amount')
    .eq('order_id', orderId)
    .eq('is_order_balance', true)
    .eq('is_paid', false)
    .gt('amount', 0)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  throwIfError(error, 'saldo do pedido')
  return data ? { id: data.id, amount: Number(data.amount) } : null
}

async function getAdjustableOrderBalance(balanceId: string): Promise<OrderBalanceRef | null> {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('id, amount, is_paid')
    .eq('id', balanceId)
    .is('deleted_at', null)
    .maybeSingle()

  throwIfError(error, 'saldo do pedido')
  if (!data) return null
  // Saldo confirmado como pago pelo usuário (com valor) não é mais ajustado automaticamente
  if (data.is_paid && Number(data.amount) > 0) return null
  return { id: data.id, amount: Number(data.amount) }
}

/**
 * Saldo que um pagamento do pedido abate. Na edição, mantém o vínculo atual
 * (somando de volta o valor antigo); senão, usa o saldo em aberto do pedido.
 */
export async function getOrderBalanceForPayment(
  orderId: string,
  linkedBalanceId?: string | null,
): Promise<OrderBalanceRef | null> {
  if (linkedBalanceId) {
    const linked = await getAdjustableOrderBalance(linkedBalanceId)
    if (linked) return linked
  }
  return findOpenOrderBalance(orderId)
}

/** Valida o valor contra o saldo disponível e retorna o id do saldo a abater (ou null). */
export async function resolveOrderBalanceForPayment(args: {
  orderId: string
  amount: number
  previous?: { balanceId: string | null; orderId: string | null; amount: number }
}): Promise<string | null> {
  const keepLinkId = args.previous?.balanceId && args.previous.orderId === args.orderId
    ? args.previous.balanceId
    : null
  const balance = await getOrderBalanceForPayment(args.orderId, keepLinkId)
  if (!balance) return null

  const available = roundMoney(balance.amount + (keepLinkId === balance.id ? args.previous!.amount : 0))
  if (roundMoney(args.amount) > available) {
    throw new Error(`O valor é maior que o saldo em aberto deste pedido (${formatCurrency(available)})`)
  }
  return balance.id
}

async function sumLinkedPayments(balanceId: string): Promise<number> {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('balance_transaction_id', balanceId)
    .is('deleted_at', null)

  throwIfError(error, 'pagamentos do pedido')
  return roundMoney((data ?? []).reduce((sum, row) => sum + Number(row.amount), 0))
}

/** Saldo atual = valor original − pagamentos vinculados. Zerado → quitado. */
export async function recomputeOrderBalance(balanceId: string): Promise<void> {
  const { data: balance, error } = await supabase
    .from('financial_transactions')
    .select('id, amount, is_paid, balance_original_amount')
    .eq('id', balanceId)
    .is('deleted_at', null)
    .maybeSingle()

  throwIfError(error, 'saldo do pedido')
  if (!balance) return
  if (balance.is_paid && Number(balance.amount) > 0) return

  const paid = await sumLinkedPayments(balanceId)
  const original = Number(balance.balance_original_amount ?? balance.amount)
  const remaining = roundMoney(Math.max(0, original - paid))
  const settled = remaining <= 0

  const { error: updateError } = await supabase
    .from('financial_transactions')
    .update({
      amount: remaining,
      is_paid: settled,
      paid_date: settled ? format(new Date(), 'yyyy-MM-dd') : null,
    })
    .eq('id', balanceId)

  throwIfError(updateError, 'atualizar saldo do pedido')
}

/** Edição manual do saldo: o valor digitado passa a ser o saldo atual. */
export async function resetOrderBalanceOriginal(balanceId: string, currentAmount: number): Promise<void> {
  const paid = await sumLinkedPayments(balanceId)
  const { error } = await supabase
    .from('financial_transactions')
    .update({ balance_original_amount: roundMoney(currentAmount + paid) })
    .eq('id', balanceId)

  throwIfError(error, 'atualizar saldo do pedido')
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
  filters: FinancialTransactionFilters = createDefaultFinancialTransactionFilters(),
  pageSize = PAGE_SIZE
) {
  return paginatedQuery<FinancialTransaction>(
    'financial_transactions',
    { page, pageSize },
    {
      select: TRANSACTION_SELECT,
      orderBy: { column: 'due_date', ascending: true },
      filters: (q) => applyFinancialTransactionFilters(q, filters),
    }
  )
}

export async function listInstallmentSchedules(transactionId: string): Promise<FinancialInstallmentSchedule[]> {
  const { data, error } = await supabase
    .from('financial_installment_schedules')
    .select('id, transaction_id, installment_number, amount, due_date, is_paid, paid_date')
    .eq('transaction_id', transactionId)
    .order('installment_number', { ascending: true })

  throwIfError(error, 'cronograma de parcelas')
  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }))
}

export async function createInstallmentPlanTransaction(
  payload: Record<string, unknown>,
): Promise<FinancialTransaction> {
  const total = Number(payload.plan_total_amount ?? payload.amount) || 0
  const count = Number(payload.installment_total) || 0
  const firstDue = String(payload.due_date ?? '')
  const schedule = buildEqualInstallmentSchedule(total, count, firstDue)
  const remaining = schedule.reduce((sum, row) => sum + row.amount, 0)

  const { data: created, error } = await supabase
    .from('financial_transactions')
    .insert({
      ...payload,
      amount: remaining,
      due_date: schedule[0]?.due_date ?? firstDue,
      is_paid: false,
      is_installment_plan: true,
      plan_total_amount: total,
      installment_total: count,
      installment_number: null,
    })
    .select('id')
    .single()

  throwIfError(error, 'lançamento parcelado')
  if (!created?.id) {
    throw new Error('Falha ao criar lançamento parcelado')
  }

  const transactionId = created.id

  const { error: scheduleError } = await supabase
    .from('financial_installment_schedules')
    .insert(schedule.map((row) => ({
      transaction_id: transactionId,
      installment_number: row.installment_number,
      amount: row.amount,
      due_date: row.due_date,
      is_paid: false,
    })))

  if (scheduleError) {
    await supabase.from('financial_transactions').delete().eq('id', transactionId)
    throwIfError(scheduleError, 'cronograma de parcelas')
  }

  const { data: full, error: loadError } = await supabase
    .from('financial_transactions')
    .select(TRANSACTION_SELECT)
    .eq('id', transactionId)
    .single()

  throwIfError(loadError, 'lançamento parcelado')
  if (!full) {
    throw new Error('Falha ao carregar lançamento parcelado')
  }

  return full as unknown as FinancialTransaction
}

/** Contas fixas: um lançamento independente por mês (valores editáveis individualmente). */
function buildRecurringFixedBillRows(
  payload: Record<string, unknown>,
  monthCount: number,
  startOffset: number,
): Record<string, unknown>[] {
  const firstDue = String(payload.due_date ?? '')
  return Array.from({ length: monthCount }, (_, index) => ({
    ...payload,
    due_date: shiftDueDateByMonths(firstDue, startOffset + index),
    is_paid: false,
    is_installment_plan: false,
    plan_total_amount: null,
    installment_number: null,
    installment_total: null,
  }))
}

export async function createRecurringFixedBillTransactions(
  payload: Record<string, unknown>,
  monthCount: number,
): Promise<number> {
  const firstDue = String(payload.due_date ?? '')
  if (!firstDue) {
    throw new Error('Informe o vencimento do primeiro mês')
  }
  if (monthCount < 2) {
    throw new Error('Contas fixas recorrentes exigem ao menos 2 meses')
  }

  const rows = buildRecurringFixedBillRows(payload, monthCount, 0)

  const { error } = await supabase.from('financial_transactions').insert(rows)
  throwIfError(error, 'lançamentos de contas fixas')
  return monthCount
}

/** Edição: mantém o lançamento atual e cria os meses seguintes. */
export async function appendRecurringFixedBillMonths(
  payload: Record<string, unknown>,
  totalMonthCount: number,
): Promise<number> {
  const firstDue = String(payload.due_date ?? '')
  if (!firstDue) {
    throw new Error('Informe o vencimento do primeiro mês')
  }
  if (totalMonthCount < 2) {
    throw new Error('Contas fixas recorrentes exigem ao menos 2 meses')
  }

  const additionalCount = totalMonthCount - 1
  const rows = buildRecurringFixedBillRows(payload, additionalCount, 1)

  const { error } = await supabase.from('financial_transactions').insert(rows)
  throwIfError(error, 'lançamentos de contas fixas')
  return additionalCount
}

/**
 * Gera o cronograma interno para um lançamento já marcado como plano parcelado
 * (ou converte um lançamento simples em plano). Usado na criação, na edição e no reparo.
 */
export async function attachInstallmentSchedules(
  transactionId: string,
  totalAmount: number,
  installmentCount: number,
  firstDueDate: string,
): Promise<FinancialInstallmentSchedule[]> {
  const existing = await listInstallmentSchedules(transactionId)
  if (existing.length > 0) return existing

  const schedule = buildEqualInstallmentSchedule(totalAmount, installmentCount, firstDueDate)
  const remaining = schedule.reduce((sum, row) => sum + row.amount, 0)

  const { error: scheduleError } = await supabase
    .from('financial_installment_schedules')
    .insert(schedule.map((row) => ({
      transaction_id: transactionId,
      installment_number: row.installment_number,
      amount: row.amount,
      due_date: row.due_date,
      is_paid: false,
    })))

  throwIfError(scheduleError, 'cronograma de parcelas')

  const { error: parentError } = await supabase
    .from('financial_transactions')
    .update({
      is_installment_plan: true,
      plan_total_amount: totalAmount,
      installment_total: installmentCount,
      installment_number: null,
      amount: remaining,
      due_date: schedule[0]?.due_date ?? firstDueDate,
      is_paid: false,
      paid_date: null,
    })
    .eq('id', transactionId)

  throwIfError(parentError, 'atualizar lançamento parcelado')

  return listInstallmentSchedules(transactionId)
}

/** Se o plano está sem parcelas (ex.: edição antiga), recria o cronograma. */
export async function ensureInstallmentSchedules(
  tx: Pick<
    FinancialTransaction,
    'id' | 'is_installment_plan' | 'plan_total_amount' | 'amount' | 'installment_total' | 'due_date'
  >,
): Promise<FinancialInstallmentSchedule[]> {
  const existing = await listInstallmentSchedules(tx.id)
  if (existing.length > 0) return existing
  if (!tx.is_installment_plan) return []

  const total = Number(tx.plan_total_amount ?? tx.amount) || 0
  const count = Number(tx.installment_total) || 0
  const firstDue = tx.due_date ?? ''
  if (total <= 0 || count < 2 || !firstDue) {
    throw new Error(
      'Este lançamento está marcado como parcelado, mas faltam dados para gerar o cronograma. Edite o valor, parcelas e vencimento.',
    )
  }

  return attachInstallmentSchedules(tx.id, total, count, firstDue)
}

/**
 * Converte um lançamento simples em plano parcelado com cronograma.
 * Evita o bug de salvar is_installment_plan=true sem parcelas na edição.
 */
export async function convertToInstallmentPlan(
  transactionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const total = Number(payload.plan_total_amount ?? payload.amount) || 0
  const count = Number(payload.installment_total) || 0
  const firstDue = String(payload.due_date ?? '')

  // Valida o cronograma antes de gravar o pai
  buildEqualInstallmentSchedule(total, count, firstDue)

  const { error } = await supabase
    .from('financial_transactions')
    .update({
      ...payload,
      is_installment_plan: true,
      plan_total_amount: total,
      installment_total: count,
      installment_number: null,
      is_paid: false,
      paid_date: null,
    })
    .eq('id', transactionId)

  throwIfError(error, 'converter lançamento parcelado')
  await attachInstallmentSchedules(transactionId, total, count, firstDue)
}

async function syncParentFromSchedules(transactionId: string): Promise<void> {
  const schedules = await listInstallmentSchedules(transactionId)
  const unpaid = schedules.filter((s) => !s.is_paid)
  const remaining = unpaid.reduce((sum, s) => sum + s.amount, 0)
  const nextDue = unpaid[0]?.due_date ?? schedules[schedules.length - 1]?.due_date ?? null
  const allPaid = unpaid.length === 0 && schedules.length > 0

  const { error } = await supabase
    .from('financial_transactions')
    .update({
      amount: remaining,
      due_date: nextDue,
      is_paid: allPaid,
      paid_date: allPaid ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', transactionId)

  throwIfError(error, 'atualizar lançamento parcelado')
}

/** Confirma a próxima parcela em aberto (ou uma parcela específica). */
export async function markInstallmentPaid(
  transactionId: string,
  scheduleId?: string,
): Promise<void> {
  let schedules = await listInstallmentSchedules(transactionId)
  if (schedules.length === 0) {
    const { data: tx, error } = await supabase
      .from('financial_transactions')
      .select('id, is_installment_plan, plan_total_amount, amount, installment_total, due_date')
      .eq('id', transactionId)
      .single()
    throwIfError(error, 'lançamento')
    if (tx?.is_installment_plan) {
      schedules = await ensureInstallmentSchedules(tx as FinancialTransaction)
    }
  }

  const target = scheduleId
    ? schedules.find((s) => s.id === scheduleId)
    : schedules.find((s) => !s.is_paid)

  if (!target) {
    throw new Error('Nenhuma parcela pendente para confirmar')
  }
  if (target.is_paid) {
    throw new Error('Esta parcela já está paga')
  }

  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('financial_installment_schedules')
    .update({ is_paid: true, paid_date: today })
    .eq('id', target.id)

  throwIfError(error, 'confirmar parcela')
  await syncParentFromSchedules(transactionId)
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
