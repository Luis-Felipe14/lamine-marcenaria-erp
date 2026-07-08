import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'

export async function fetchClientOptions() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  throwIfError(error, 'clientes')
  return data ?? []
}

export async function fetchOrderOptions() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, number, client_id, value')
    .is('deleted_at', null)
    .order('number', { ascending: false })
  throwIfError(error, 'pedidos')
  return data ?? []
}

export async function fetchSupplierOptions() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  throwIfError(error, 'fornecedores')
  return data ?? []
}

export async function fetchArchitectOptions() {
  const { data, error } = await supabase
    .from('architects')
    .select('id, name')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')
  throwIfError(error, 'arquitetos')
  return data ?? []
}

export async function fetchMaterialOptions() {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  throwIfError(error, 'materiais')
  return data ?? []
}

export interface BudgetMaterialOption {
  id: string
  code: string | null
  name: string
  category: string
  unit: string
  unit_cost: number
  current_stock: number
  supplier_id: string | null
}

export interface LumberCreditMaterialOption extends BudgetMaterialOption {
  specification: string | null
  brand: string | null
}

export async function fetchMaterialsForBudget(): Promise<BudgetMaterialOption[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('id, code, name, category, unit, unit_cost, current_stock, supplier_id')
    .is('deleted_at', null)
    .order('name')
  throwIfError(error, 'materiais')
  return (data ?? []).map((m) => ({
    ...m,
    unit_cost: Number(m.unit_cost),
    current_stock: Number(m.current_stock),
    supplier_id: m.supplier_id ?? null,
  }))
}

export async function fetchMaterialsForLumberCredit(): Promise<LumberCreditMaterialOption[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('id, code, name, category, unit, unit_cost, current_stock, supplier_id, specification, brand')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name')

  throwIfError(error, 'materiais')
  return (data ?? []).map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    category: m.category,
    unit: m.unit,
    unit_cost: Number(m.unit_cost),
    current_stock: Number(m.current_stock),
    supplier_id: m.supplier_id ?? null,
    specification: m.specification ?? null,
    brand: m.brand ?? null,
  }))
}

export async function fetchPurchaseOptions() {
  const { data, error } = await supabase
    .from('purchases')
    .select('id, number, description, total_price, supplier_id, invoice_number')
    .order('number', { ascending: false })
  throwIfError(error, 'compras')
  return data ?? []
}

export interface EmployeePayrollOption {
  id: string
  name: string
  salary: number | null
  position: string | null
  is_active: boolean
}

export async function fetchEmployeePayrollOptions(): Promise<EmployeePayrollOption[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, salary, position, is_active')
    .is('deleted_at', null)
    .order('name')
  throwIfError(error, 'funcionários')
  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    position: e.position ?? null,
    is_active: e.is_active ?? true,
    salary: e.salary != null ? Number(e.salary) : null,
  }))
}
