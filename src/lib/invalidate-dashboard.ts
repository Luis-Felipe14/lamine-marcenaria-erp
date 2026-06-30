import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

/** Invalida métricas de layout e dashboard após mutações que afetam KPIs/badges. */
export async function invalidateDashboardMetrics(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['layout'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.criticalStockCount }),
  ])
}
