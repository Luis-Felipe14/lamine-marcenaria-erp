import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/lib/constants'
import type { PaginatedResult } from '@/types'
import {
  buildLumberCreditSaidaPayload,
  formatMaterialLineDescription,
  type LumberCreditFormState,
  type LumberCreditMaterialLine,
} from '@/lib/lumberyard-credit-form.schema'

import { throwIfError } from '@/lib/supabase-helpers'
import { formatInstallment } from '@/lib/utils'
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'

export type LumberCreditMovementType = 'entrada' | 'saida'

export interface LumberCreditMovement {
  id: string
  movement_type: LumberCreditMovementType
  amount: number
  movement_date: string
  client_id: string | null
  order_id: string | null
  supplier_id: string | null
  material_id: string | null
  material_description: string | null
  material_lines?: LumberCreditMaterialLine[] | null
  quantity: number | null
  invoice_number: string | null
  installment_number: number | null
  installment_total: number | null
  payment_method: string | null
  notes: string | null
  purchase_id: string | null
  created_at: string
  client?: { name: string } | null
  order?: { number: number } | null
  supplier?: { name: string } | null
  material?: { name: string } | null
  purchase?: { number: number } | null
}

export interface LumberCreditStats {
  totalEntrada: number
  totalSaida: number
  balance: number
  lastMovement: LumberCreditMovement | null
}

export interface LumberCreditClientBalance {
  client_id: string
  client_name: string
  total_entrada: number
  total_saida: number
  balance: number
}

export interface LumberCreditSettings {
  allow_cross_client: boolean
}

export const DEFAULT_LUMBER_CREDIT_SETTINGS: LumberCreditSettings = {
  allow_cross_client: false,
}

export interface LumberCreditMovementRow extends LumberCreditMovement {
  balanceAfter: number
}

export interface LumberCreditFilters {
  year?: number
  month?: number | 'all'
  clientId?: string
  movementType?: LumberCreditMovementType | 'all'
}

const SELECT_QUERY =
  '*, client:clients(name), order:orders(number), supplier:suppliers(name), material:materials(name), purchase:purchases(number)'

export async function listLumberCreditMovements(filters: LumberCreditFilters = {}): Promise<LumberCreditMovement[]> {
  let query = supabase
    .from('lumberyard_credit_movements')
    .select(SELECT_QUERY)
    .is('deleted_at', null)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })

  query = applyLumberCreditFilters(query, filters)

  const { data, error } = await query
  throwIfError(error, 'lumberyard credit movements')
  return (data ?? []) as LumberCreditMovement[]
}

function applyLumberCreditFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: LumberCreditFilters
) {
  if (filters.clientId) query = query.eq('client_id', filters.clientId)
  if (filters.movementType && filters.movementType !== 'all') {
    query = query.eq('movement_type', filters.movementType)
  }
  if (filters.year) {
    if (filters.month && filters.month !== 'all') {
      const { start, end } = monthRange(filters.year, filters.month)
      query = query.gte('movement_date', start).lte('movement_date', end)
    } else {
      query = query.gte('movement_date', `${filters.year}-01-01`).lte('movement_date', `${filters.year}-12-31`)
    }
  }
  return query
}

export async function listLumberCreditMovementsPaginated(
  filters: LumberCreditFilters & { page?: number; pageSize?: number } = {}
): Promise<PaginatedResult<LumberCreditMovement>> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('lumberyard_credit_movements')
    .select(SELECT_QUERY, { count: 'exact' })
    .is('deleted_at', null)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  query = applyLumberCreditFilters(query, filters)

  const { data, error, count } = await query
  throwIfError(error, 'lumberyard credit movements paginado')
  const total = count ?? 0

  return {
    data: (data ?? []) as LumberCreditMovement[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

export async function listAllLumberCreditMovementsForStats(): Promise<LumberCreditMovement[]> {
  const { data, error } = await supabase
    .from('lumberyard_credit_movements')
    .select('id, movement_type, amount, movement_date, created_at, client_id')
    .is('deleted_at', null)

  throwIfError(error, 'lumberyard credit stats')
  return (data ?? []) as LumberCreditMovement[]
}

export async function getLumberCreditBalance(clientId?: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('get_lumber_credit_balance', {
    p_client_id: clientId ?? null,
  })
  throwIfError(error, 'saldo crédito madereira')
  return Number(data) || 0
}

export async function listLumberCreditBalancesByClient(): Promise<LumberCreditClientBalance[]> {
  const { data, error } = await supabase.rpc('get_lumber_credit_balances_by_client')
  throwIfError(error, 'saldos por cliente')
  const rows = (data ?? []) as Array<{
    client_id: string
    client_name: string
    total_entrada: number
    total_saida: number
    balance: number
  }>
  return rows.map((row) => ({
    client_id: row.client_id,
    client_name: row.client_name,
    total_entrada: Number(row.total_entrada) || 0,
    total_saida: Number(row.total_saida) || 0,
    balance: Number(row.balance) || 0,
  }))
}

export async function getLumberCreditSettings(): Promise<LumberCreditSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'lumber_credit')
    .maybeSingle()

  throwIfError(error, 'configurações crédito madereira')
  const value = data?.value as Partial<LumberCreditSettings> | undefined
  return {
    allow_cross_client: value?.allow_cross_client ?? DEFAULT_LUMBER_CREDIT_SETTINGS.allow_cross_client,
  }
}

export async function saveLumberCreditSettings(settings: LumberCreditSettings): Promise<void> {
  const { data: existing, error: loadError } = await supabase
    .from('settings')
    .select('id')
    .eq('key', 'lumber_credit')
    .maybeSingle()

  throwIfError(loadError, 'configurações crédito madereira')

  const payload = {
    key: 'lumber_credit',
    value: settings,
  }

  const { error } = existing
    ? await supabase.from('settings').update({ value: payload.value }).eq('key', 'lumber_credit')
    : await supabase.from('settings').insert(payload)

  throwIfError(error, 'salvar configurações crédito madereira')
}

export function filterMovementsByClient(
  movements: LumberCreditMovement[],
  clientId?: string,
): LumberCreditMovement[] {
  if (!clientId) return movements
  return movements.filter((movement) => movement.client_id === clientId)
}

export function computeLumberCreditStats(
  movements: LumberCreditMovement[],
  clientId?: string,
): LumberCreditStats {
  const scoped = filterMovementsByClient(movements, clientId)
  const totalEntrada = scoped
    .filter((m) => m.movement_type === 'entrada')
    .reduce((s, m) => s + Number(m.amount), 0)
  const totalSaida = scoped
    .filter((m) => m.movement_type === 'saida')
    .reduce((s, m) => s + Number(m.amount), 0)

  const sorted = [...scoped].sort((a, b) => {
    const d = parseISO(a.movement_date).getTime() - parseISO(b.movement_date).getTime()
    if (d !== 0) return d
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  return {
    totalEntrada,
    totalSaida,
    balance: totalEntrada - totalSaida,
    lastMovement: sorted.length ? sorted[sorted.length - 1] : null,
  }
}

export function withRunningBalances(
  displayMovements: LumberCreditMovement[],
  allMovements: LumberCreditMovement[] = displayMovements,
  options: { clientId?: string } = {},
): LumberCreditMovementRow[] {
  const scope = (list: LumberCreditMovement[]) => filterMovementsByClient(list, options.clientId)

  const asc = [...scope(allMovements)].sort((a, b) => {
    const d = parseISO(a.movement_date).getTime() - parseISO(b.movement_date).getTime()
    if (d !== 0) return d
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  let running = 0
  const balanceMap = new Map<string, number>()
  for (const m of asc) {
    running += m.movement_type === 'entrada' ? Number(m.amount) : -Number(m.amount)
    balanceMap.set(m.id, running)
  }

  return displayMovements.map((m) => ({
    ...m,
    balanceAfter: balanceMap.get(m.id) ?? 0,
  }))
}

export function monthRange(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(start)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

export interface LumberCreditPayload {
  movement_type: LumberCreditMovementType
  amount: number
  movement_date: string
  client_id?: string | null
  order_id?: string | null
  supplier_id?: string | null
  material_id?: string | null
  material_description?: string | null
  material_lines?: LumberCreditMaterialLine[] | null
  quantity?: number | null
  invoice_number?: string | null
  installment_number?: number | null
  installment_total?: number | null
  payment_method?: string | null
  notes?: string | null
  created_by?: string | null
}

export async function syncSaidaMaterialLinesToPurchases(
  movementId: string,
  lines: LumberCreditMaterialLine[],
  data: Pick<LumberCreditPayload, 'supplier_id' | 'invoice_number' | 'notes'>,
  userId?: string | null,
): Promise<LumberCreditMaterialLine[]> {
  const creditNote = data.notes?.trim()
  const updatedLines: LumberCreditMaterialLine[] = []

  for (const line of lines) {
    const description = [
      formatMaterialLineDescription(line),
      'Pagamento via crédito madereira',
      creditNote,
    ].filter(Boolean).join(' — ') || 'Material — crédito madereira'

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        supplier_id: data.supplier_id || null,
        material_id: line.material_id,
        description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.amount,
        invoice_number: data.invoice_number || null,
        status: 'recebido',
        requested_by: userId || null,
        received_at: new Date().toISOString(),
      })
      .select('id, number')
      .single()

    throwIfError(purchaseError, 'criar compra via crédito madereira')

    updatedLines.push({
      ...line,
      purchase_id: purchase!.id as string,
      purchase_number: purchase!.number as number,
    })
  }

  const { error: linkError } = await supabase
    .from('lumberyard_credit_movements')
    .update({
      material_lines: updatedLines,
      purchase_id: updatedLines[0]?.purchase_id ?? null,
    })
    .eq('id', movementId)

  throwIfError(linkError, 'vincular compras ao crédito')

  return updatedLines
}

export async function syncSaidaToPurchaseAndStock(
  movementId: string,
  data: LumberCreditPayload,
  userId?: string | null
): Promise<string | null> {
  if (data.movement_type !== 'saida') return null

  const qty = Number(data.quantity) || 1
  const total = Number(data.amount)
  const unitPrice = Math.round((total / qty) * 100) / 100

  const creditNote = data.notes?.trim()
  const description = [
    data.material_description?.trim(),
    'Pagamento via crédito madereira',
    creditNote,
  ].filter(Boolean).join(' — ') || 'Material — crédito madereira'

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      supplier_id: data.supplier_id || null,
      material_id: data.material_id || null,
      description,
      quantity: qty,
      unit_price: unitPrice,
      total_price: total,
      invoice_number: data.invoice_number || null,
      status: 'recebido',
      requested_by: userId || null,
      received_at: new Date().toISOString(),
    })
    .select('id, number')
    .single()

  throwIfError(purchaseError, 'criar compra via crédito madereira')

  const { error: linkError } = await supabase
    .from('lumberyard_credit_movements')
    .update({ purchase_id: purchase!.id })
    .eq('id', movementId)

  throwIfError(linkError, 'vincular compra ao crédito')

  return purchase!.id as string
}

export async function saveLumberCreditMovement(
  payload: LumberCreditPayload,
  options: { editingId?: string; autoSync?: boolean; userId?: string | null } = {}
): Promise<LumberCreditMovement> {
  if (options.editingId) {
    const updated = await supabase
      .from('lumberyard_credit_movements')
      .update(payload)
      .eq('id', options.editingId)
      .select(SELECT_QUERY)
      .single()
    throwIfError(updated.error, 'atualizar crédito madereira')
    return updated.data as LumberCreditMovement
  }

  const { data: created, error } = await supabase
    .from('lumberyard_credit_movements')
    .insert(payload)
    .select(SELECT_QUERY)
    .single()

  throwIfError(error, 'criar crédito madereira')
  const movement = created as LumberCreditMovement

  if (options.autoSync && payload.movement_type === 'saida') {
    await syncSaidaToPurchaseAndStock(movement.id, payload, options.userId)
    const { data: refreshed, error: refreshError } = await supabase
      .from('lumberyard_credit_movements')
      .select(SELECT_QUERY)
      .eq('id', movement.id)
      .single()
    throwIfError(refreshError, 'recarregar crédito madereira')
    return refreshed as LumberCreditMovement
  }

  return movement
}

export async function saveLumberCreditSaidaBatch(
  form: LumberCreditFormState,
  options: { autoSync?: boolean; userId?: string | null } = {},
): Promise<LumberCreditMovement> {
  const payload = buildLumberCreditSaidaPayload(form)
  const movement = await saveLumberCreditMovement(
    { ...payload, created_by: options.userId ?? null },
    { autoSync: false, userId: options.userId },
  )

  if (options.autoSync && payload.material_lines?.length) {
    await syncSaidaMaterialLinesToPurchases(
      movement.id,
      payload.material_lines,
      payload,
      options.userId,
    )
    const { data: refreshed, error: refreshError } = await supabase
      .from('lumberyard_credit_movements')
      .select(SELECT_QUERY)
      .eq('id', movement.id)
      .single()
    throwIfError(refreshError, 'recarregar crédito madereira')
    return refreshed as LumberCreditMovement
  }

  return movement
}

export function getLumberCreditPurchaseNumbers(row: LumberCreditMovement): number[] {
  const fromLines = (row.material_lines ?? [])
    .map((line) => line.purchase_number)
    .filter((value): value is number => typeof value === 'number')
  if (fromLines.length > 0) return fromLines
  return row.purchase?.number ? [row.purchase.number] : []
}

export function formatLumberCreditMovementDetail(row: LumberCreditMovement): string {
  if (row.movement_type === 'entrada') {
    const parts: string[] = []
    if (row.client?.name) parts.push(row.client.name)
    if (row.order?.number) parts.push(`Pedido #${row.order.number}`)
    if (row.installment_number && row.installment_total) {
      parts.push(`Cartão ${formatInstallment(row.installment_number, row.installment_total)}`)
    }
    return parts.join(' · ') || 'Entrada de crédito'
  }

  const client = row.client?.name
  const lines = row.material_lines ?? []

  if (lines.length > 0) {
    const items = lines.map((line) => `${line.name} (${line.quantity} ${line.unit})`).join(', ')
    return [client, items].filter(Boolean).join(' · ')
  }

  const mat = row.material?.name ?? row.material_description
  const qty = row.quantity ? ` (${row.quantity})` : ''
  const parts = [client, mat ? `${mat}${qty}` : 'Saída de material'].filter(Boolean)
  return parts.join(' · ')
}

export async function deleteLumberCreditMovement(id: string): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_lumberyard_credit_movement', { p_id: id })

  throwIfError(error, 'excluir crédito madereira')
}

