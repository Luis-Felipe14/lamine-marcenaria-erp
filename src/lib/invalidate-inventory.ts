import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { invalidateDashboardMetrics } from '@/lib/invalidate-dashboard'

export async function invalidateInventoryQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['materials'] }),
    queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.criticalStockCount }),
    invalidateDashboardMetrics(queryClient),
  ])
}
