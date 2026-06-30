import { supabase } from '@/lib/supabase'
import { CONSUMPTION_CATEGORIES, MATERIAL_CATEGORIES } from '@/lib/constants'
import { throwIfError } from '@/lib/supabase-helpers'
import type { MaterialUsageType } from '@/types'

export type MaterialCategoryUsageType = MaterialUsageType

export interface MaterialCategoryOption {
  id: string
  value: string
  label: string
  sort_order: number
  usage_type: MaterialCategoryUsageType
}

function fallbackCategories(): MaterialCategoryOption[] {
  const materiaPrima = MATERIAL_CATEGORIES.map((c, index) => ({
    id: `mp-${c.value}`,
    value: c.value,
    label: c.label,
    sort_order: index + 1,
    usage_type: 'materia_prima' as const,
  }))
  const consumo = CONSUMPTION_CATEGORIES.map((c, index) => ({
    id: `cons-${c.value}`,
    value: c.value,
    label: c.label,
    sort_order: index + 1,
    usage_type: 'consumo' as const,
  }))
  return [...materiaPrima, ...consumo]
}

export function slugifyMaterialCategory(label: string): string {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug || 'categoria'
}

export function resolveMaterialCategoryLabel(
  value: string,
  categories: MaterialCategoryOption[] = [],
): string {
  return categories.find((c) => c.value === value)?.label
    ?? MATERIAL_CATEGORIES.find((c) => c.value === value)?.label
    ?? CONSUMPTION_CATEGORIES.find((c) => c.value === value)?.label
    ?? value
}

export async function fetchMaterialCategories(): Promise<MaterialCategoryOption[]> {
  const { data, error } = await supabase
    .from('material_categories')
    .select('id, value, label, sort_order, usage_type')
    .is('deleted_at', null)
    .order('usage_type')
    .order('sort_order')
    .order('label')

  if (error) {
    if (error.code === '42P01' || error.message.includes('material_categories')) {
      return fallbackCategories()
    }
    if (error.message.includes('usage_type')) {
      const { data: legacy, error: legacyError } = await supabase
        .from('material_categories')
        .select('id, value, label, sort_order')
        .is('deleted_at', null)
        .order('sort_order')
        .order('label')
      if (legacyError) return fallbackCategories()
      const materiaPrima = (legacy ?? []).map((c) => ({
        ...c,
        usage_type: 'materia_prima' as const,
      }))
      return [...materiaPrima, ...fallbackCategories().filter((c) => c.usage_type === 'consumo')]
    }
    throwIfError(error, 'categorias de material')
  }

  if (!data?.length) return fallbackCategories()

  return data.map((c) => ({
    ...c,
    usage_type: (c.usage_type === 'consumo' ? 'consumo' : 'materia_prima') as MaterialCategoryUsageType,
  }))
}

export async function createMaterialCategory(
  label: string,
  usageType: MaterialCategoryUsageType,
): Promise<MaterialCategoryOption> {
  const trimmed = label.trim()
  if (!trimmed) throw new Error('Informe o nome da categoria')

  const value = slugifyMaterialCategory(trimmed)
  const { data: existing } = await supabase
    .from('material_categories')
    .select('id')
    .eq('value', value)
    .eq('usage_type', usageType)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) throw new Error('Já existe uma categoria com esse nome')

  const { data: last } = await supabase
    .from('material_categories')
    .select('sort_order')
    .eq('usage_type', usageType)
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('material_categories')
    .insert({
      value,
      label: trimmed,
      sort_order: (last?.sort_order ?? 0) + 1,
      usage_type: usageType,
    })
    .select('id, value, label, sort_order, usage_type')
    .single()

  throwIfError(error, 'categoria')
  if (!data) throw new Error('Categoria não encontrada')
  return {
    ...data,
    usage_type: data.usage_type === 'consumo' ? 'consumo' : 'materia_prima',
  } as MaterialCategoryOption
}

export async function updateMaterialCategory(
  id: string,
  label: string,
): Promise<MaterialCategoryOption> {
  const trimmed = label.trim()
  if (!trimmed) throw new Error('Informe o nome da categoria')

  const { data, error } = await supabase
    .from('material_categories')
    .update({ label: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, value, label, sort_order, usage_type')
    .single()

  throwIfError(error, 'categoria')
  if (!data) throw new Error('Categoria não encontrada')
  return {
    ...data,
    usage_type: data.usage_type === 'consumo' ? 'consumo' : 'materia_prima',
  } as MaterialCategoryOption
}

export async function deleteMaterialCategory(
  id: string,
  value: string,
  usageType: MaterialCategoryUsageType,
): Promise<void> {
  const { count, error: countError } = await supabase
    .from('materials')
    .select('id', { count: 'exact', head: true })
    .eq('category', value)
    .eq('usage_type', usageType)
    .is('deleted_at', null)

  throwIfError(countError, 'materiais')
  if ((count ?? 0) > 0) {
    throw new Error('Não é possível excluir: há materiais usando esta categoria')
  }

  const { error } = await supabase
    .from('material_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  throwIfError(error, 'categoria')
}
