import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import { throwIfError } from '@/lib/supabase-helpers'

export interface Purchase {
  id: string
  number: number
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  status: string
  invoice_number: string | null
  supplier?: { name: string }
  material?: { name: string }
}

export async function listPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(name), material:materials(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  throwIfError(error, 'compras')
  return (data ?? []) as Purchase[]
}

export async function listPurchasesPaginated(page: number, pageSize = PAGE_SIZE) {
  return paginatedQuery<Purchase>(
    'purchases',
    { page, pageSize },
    {
      select: '*, supplier:suppliers(name), material:materials(name)',
      orderBy: { column: 'created_at', ascending: false },
    }
  )
}
