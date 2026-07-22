import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  countCriticalStock,
  getGlobalHeaderMetrics,
  getSidebarBadges,
  getRecentActivities,
  getNotifications,
} from '@/services/dashboard.service'
import { getSecretaryAccessSettings } from '@/services/secretary-access.service'

/** Hooks usados pelo chrome autenticado (Header/Sidebar/Layout) — bundle enxuto. */

export function useHeaderMetrics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.headerMetrics,
    queryFn: getGlobalHeaderMetrics,
    staleTime: 120_000,
    enabled: options?.enabled ?? true,
  })
}

export function useSidebarBadgesQuery() {
  return useQuery({
    queryKey: queryKeys.sidebarBadges,
    queryFn: getSidebarBadges,
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  })
}

export function useRecentActivities(limit = 8) {
  return useQuery({
    queryKey: queryKeys.recentActivities(limit),
    queryFn: () => getRecentActivities(limit),
    staleTime: 60_000,
  })
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications(userId ?? ''),
    queryFn: () => getNotifications(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

export function useSecretaryAccessSettings() {
  return useQuery({
    queryKey: queryKeys.secretaryAccess,
    queryFn: getSecretaryAccessSettings,
    staleTime: 60_000,
  })
}

export function useCriticalStockCount() {
  return useQuery({
    queryKey: queryKeys.criticalStockCount,
    queryFn: countCriticalStock,
    staleTime: 120_000,
  })
}
