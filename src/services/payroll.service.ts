import { format, lastDayOfMonth, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { TimeEntryType, ReceiptType } from '@/types'

export interface PayrollEmployee {
  id: string
  name: string
  position: string
  salary: number | null
  is_active: boolean
}

export interface PayrollTimeEntry {
  id: string
  employee_id: string | null
  user_id: string | null
  production_order_id: string | null
  hours: number
  description: string | null
  entry_date: string
  entry_type: TimeEntryType
  employee?: { name: string; position: string } | null
  production_order?: { number: number } | null
}

export interface EmployeeReceipt {
  id: string
  employee_id: string
  amount: number
  receipt_date: string
  reference_month: string
  receipt_type: ReceiptType
  description: string | null
  employee?: { name: string; position: string }
}

export interface PayrollMonthlyRow {
  employee: PayrollEmployee
  overtimeHours: number
  receiptsTotal: number
}

function monthRange(referenceMonth: string) {
  const start = `${referenceMonth}-01`
  const end = format(lastDayOfMonth(parseISO(start)), 'yyyy-MM-dd')
  return { start, end }
}

function referenceMonthDate(referenceMonth: string) {
  return `${referenceMonth}-01`
}

export async function listPayrollEmployees(): Promise<PayrollEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, position, salary, is_active')
    .is('deleted_at', null)
    .order('name')

  if (error) throw error
  return (data ?? []) as PayrollEmployee[]
}

export async function getPayrollMonthlySummary(referenceMonth: string): Promise<PayrollMonthlyRow[]> {
  const { start, end } = monthRange(referenceMonth)
  const monthDate = referenceMonthDate(referenceMonth)

  const [employees, timeEntries, receipts] = await Promise.all([
    listPayrollEmployees(),
    supabase
      .from('production_time_entries')
      .select('employee_id, hours')
      .eq('entry_type', 'hora_extra')
      .gte('entry_date', start)
      .lte('entry_date', end),
    supabase
      .from('employee_receipts')
      .select('employee_id, amount')
      .eq('reference_month', monthDate)
      .is('deleted_at', null),
  ])

  if (timeEntries.error) throw timeEntries.error
  if (receipts.error) throw receipts.error

  const overtimeByEmployee = new Map<string, number>()
  const receiptsByEmployee = new Map<string, number>()

  for (const entry of timeEntries.data ?? []) {
    if (!entry.employee_id) continue
    overtimeByEmployee.set(
      entry.employee_id,
      (overtimeByEmployee.get(entry.employee_id) ?? 0) + Number(entry.hours),
    )
  }

  for (const receipt of receipts.data ?? []) {
    receiptsByEmployee.set(
      receipt.employee_id,
      (receiptsByEmployee.get(receipt.employee_id) ?? 0) + Number(receipt.amount),
    )
  }

  return employees.map((employee) => ({
    employee,
    overtimeHours: overtimeByEmployee.get(employee.id) ?? 0,
    receiptsTotal: receiptsByEmployee.get(employee.id) ?? 0,
  }))
}

export async function listPayrollTimeEntries(referenceMonth: string): Promise<PayrollTimeEntry[]> {
  const { start, end } = monthRange(referenceMonth)
  const { data, error } = await supabase
    .from('production_time_entries')
    .select(`
      id, employee_id, user_id, production_order_id, hours, description, entry_date, entry_type,
      employee:employees(name, position),
      production_order:production_orders(number)
    `)
    .eq('entry_type', 'hora_extra')
    .gte('entry_date', start)
    .lte('entry_date', end)
    .order('entry_date', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    employee: Array.isArray(row.employee) ? row.employee[0] ?? null : row.employee,
    production_order: Array.isArray(row.production_order) ? row.production_order[0] ?? null : row.production_order,
  })) as PayrollTimeEntry[]
}

export async function createPayrollTimeEntry(input: {
  employee_id: string
  hours: number
  entry_date: string
  entry_type: TimeEntryType
  description?: string
  user_id?: string | null
}) {
  const { data, error } = await supabase
    .from('production_time_entries')
    .insert({
      employee_id: input.employee_id,
      user_id: input.user_id ?? null,
      production_order_id: null,
      hours: input.hours,
      entry_date: input.entry_date,
      entry_type: input.entry_type,
      description: input.description?.trim() || null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function deletePayrollTimeEntry(id: string) {
  const { error } = await supabase.from('production_time_entries').delete().eq('id', id)
  if (error) throw error
}

export async function listEmployeeReceipts(referenceMonth: string): Promise<EmployeeReceipt[]> {
  const monthDate = referenceMonthDate(referenceMonth)
  const { data, error } = await supabase
    .from('employee_receipts')
    .select('id, employee_id, amount, receipt_date, reference_month, receipt_type, description, employee:employees(name, position)')
    .eq('reference_month', monthDate)
    .is('deleted_at', null)
    .order('receipt_date', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    employee: Array.isArray(row.employee) ? row.employee[0] : row.employee,
  })) as EmployeeReceipt[]
}

export async function createEmployeeReceipt(input: {
  employee_id: string
  amount: number
  receipt_date: string
  reference_month: string
  receipt_type: ReceiptType
  description?: string
  created_by?: string | null
}) {
  const { data, error } = await supabase
    .from('employee_receipts')
    .insert({
      employee_id: input.employee_id,
      amount: input.amount,
      receipt_date: input.receipt_date,
      reference_month: referenceMonthDate(input.reference_month),
      receipt_type: input.receipt_type,
      description: input.description?.trim() || null,
      created_by: input.created_by ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function softDeleteEmployeeReceipt(id: string) {
  const { error } = await supabase
    .from('employee_receipts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function resolveEmployeeIdForUser(userId: string | undefined): Promise<string | null> {
  if (!userId) return null
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

export interface PayrollMonthData {
  summary: PayrollMonthlyRow[]
  timeEntries: PayrollTimeEntry[]
  receipts: EmployeeReceipt[]
  employees: PayrollEmployee[]
}

export async function fetchPayrollMonthData(referenceMonth: string): Promise<PayrollMonthData> {
  const [summary, timeEntries, receipts, employees] = await Promise.all([
    getPayrollMonthlySummary(referenceMonth),
    listPayrollTimeEntries(referenceMonth),
    listEmployeeReceipts(referenceMonth),
    listPayrollEmployees(),
  ])
  return { summary, timeEntries, receipts, employees }
}
