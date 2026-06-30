import { supabase } from '@/lib/supabase'

export interface LowStockMaterial {
  id: string
  name: string
  code: string | null
  unit: string
  current_stock: number
  min_stock: number
  usage_type: string
}

export async function listLowStockMaterials(): Promise<LowStockMaterial[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, code, unit, current_stock, min_stock, usage_type')
    .is('deleted_at', null)
    .eq('is_active', true)
    .gt('min_stock', 0)
    .order('name')

  if (error) throw error

  return (data ?? [])
    .filter((m) => Number(m.current_stock) <= Number(m.min_stock))
    .map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      unit: m.unit,
      current_stock: Number(m.current_stock),
      min_stock: Number(m.min_stock),
      usage_type: m.usage_type,
    }))
}
