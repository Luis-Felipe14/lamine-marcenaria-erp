import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/lib/constants'
import type { PaginatedResult, PaginationParams } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any

export async function paginatedQuery<T extends { id: string }>(
  table: string,
  params: PaginationParams,
  options?: {
    select?: string
    orderBy?: { column: string; ascending?: boolean }
    softDelete?: boolean
    searchColumns?: string[]
    filters?: (query: SupabaseQuery) => SupabaseQuery
  }
): Promise<PaginatedResult<T>> {
  const { page, pageSize = PAGE_SIZE, search } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const useSoftDelete = options?.softDelete !== false

  let query: SupabaseQuery = supabase
    .from(table)
    .select(options?.select ?? '*', { count: 'exact' })
    .range(from, to)

  if (useSoftDelete) {
    query = query.is('deleted_at', null)
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false })
  }

  if (search) {
    const columns = options?.searchColumns ?? ['name']
    if (columns.length === 1) {
      query = query.ilike(columns[0], `%${search}%`)
    } else {
      query = query.or(columns.map((c) => `${c}.ilike.%${search}%`).join(','))
    }
  }

  if (options?.filters) {
    query = options.filters(query)
  }

  const { data, error, count } = await query
  if (error) throw error

  const total = count ?? 0
  return {
    data: (data ?? []) as T[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

export async function softDelete(table: string, id: string) {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function createRecord<T>(table: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from(table).insert(data).select().single()
  if (error) throw error
  return result as T
}

export async function updateRecord<T>(table: string, id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single()
  if (error) throw error
  return result as T
}

export async function insertRecord<T>(table: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from(table).insert(data).select().single()
  if (error) throw error
  return result as T
}
