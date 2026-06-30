import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import type { MaterialUsageType } from '@/types'

export interface InventoryMaterial {
  id: string
  code: string | null
  name: string
  category: string
  usage_type: MaterialUsageType
  unit: string
  specification: string | null
  brand: string | null
  supplier_id: string | null
  current_stock: number
  min_stock: number
  max_stock: number | null
  unit_cost: number
  last_purchase_price: number | null
  last_purchase_at: string | null
  location: string | null
  image_url: string | null
  is_active: boolean
  notes: string | null
  supplier?: { id: string; name: string } | { id: string; name: string }[] | null
}

export interface MaterialsListFilters {
  usageType: MaterialUsageType
  category: string
  activeFilter: 'all' | 'active' | 'inactive'
  search: string
  page: number
}

export async function listMaterialsPaginated(filters: MaterialsListFilters) {
  return paginatedQuery<InventoryMaterial>(
    'materials',
    { page: filters.page, pageSize: PAGE_SIZE, search: filters.search.trim() || undefined },
    {
      select: '*, supplier:suppliers(id, name)',
      searchColumns: ['name', 'code', 'brand', 'specification', 'location'],
      orderBy: { column: 'name', ascending: true },
      filters: (query) => {
        let q = query.eq('usage_type', filters.usageType)
        if (filters.category) q = q.eq('category', filters.category)
        if (filters.activeFilter === 'active') q = q.eq('is_active', true)
        if (filters.activeFilter === 'inactive') q = q.eq('is_active', false)
        return q
      },
    }
  )
}
