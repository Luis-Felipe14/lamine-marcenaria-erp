import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'

export interface Supplier {
  id: string
  name: string
  document: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export interface SupplierPayload {
  name: string
  document?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export async function listSuppliersPaginated(page: number, search = '', pageSize = PAGE_SIZE) {
  return paginatedQuery<Supplier>(
    'suppliers',
    { page, pageSize, search },
    {
      searchColumns: ['name', 'document', 'phone', 'email'],
      orderBy: { column: 'name', ascending: true },
    },
  )
}

export async function createSupplier(payload: SupplierPayload): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: payload.name.trim(),
      document: payload.document?.trim() || null,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      notes: payload.notes?.trim() || null,
    })
    .select('*')
    .single()

  throwIfError(error, 'criar fornecedor')
  return data as Supplier
}
