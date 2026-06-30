import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  fetchMaterialCategories,
  resolveMaterialCategoryLabel,
  type MaterialCategoryOption,
  type MaterialCategoryUsageType,
} from '@/services/material-categories.service'

export function useMaterialCategories() {
  const query = useQuery({
    queryKey: queryKeys.materialCategories,
    queryFn: fetchMaterialCategories,
    staleTime: 60_000,
  })

  const categories = query.data ?? []

  const materiaPrimaCategories = useMemo(
    () => categories.filter((c) => c.usage_type === 'materia_prima'),
    [categories],
  )

  const consumoCategories = useMemo(
    () => categories.filter((c) => c.usage_type === 'consumo'),
    [categories],
  )

  const getLabel = (value: string) => resolveMaterialCategoryLabel(value, categories)

  return {
    ...query,
    categories,
    materiaPrimaCategories,
    consumoCategories,
    getLabel,
  }
}

export function useInvalidateMaterialCategories() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.materialCategories })
}

export type { MaterialCategoryOption, MaterialCategoryUsageType }
