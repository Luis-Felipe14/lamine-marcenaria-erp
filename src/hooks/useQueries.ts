import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { hasModuleAccess } from '@/lib/secretary-access'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/authStore'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'
import {
  getExecutiveMetrics,
  getFinancialChart,
  getCommercialMetrics,
  getOperationalMetrics,
  getFinancialDashboardMetrics,
} from '@/services/dashboard.service'
import { getFinancialSummary, getFinancialSettings, listFinancialTransactions } from '@/services/financial.service'
import {
  computeLumberCreditStats,
  getLumberCreditSettings,
  listAllLumberCreditMovementsForStats,
  listLumberCreditBalancesByClient,
  listLumberCreditMovementsPaginated,
  type LumberCreditFilters,
} from '@/services/lumberyard-credit.service'
import {
  fetchClientOptions,
  fetchMaterialOptions,
  fetchOrderOptions,
  fetchPurchaseOptions,
  fetchSupplierOptions,
  fetchArchitectOptions,
  fetchEmployeePayrollOptions,
} from '@/services/lookups.service'
import { paginatedQuery } from '@/services/api'
import { PAGE_SIZE } from '@/lib/constants'
import { fetchEnrichedLeads } from '@/services/crm.service'
import { fetchOrdersKanban } from '@/services/orders.service'
import { listPurchasesPaginated } from '@/services/purchases.service'
import { listProductionOrders, fetchActiveOrderOptions } from '@/services/production.service'
import { listEmployees, listEmployeesPaginated } from '@/services/employees.service'
import { listInvestments, listInvestmentsPaginated } from '@/services/marketing.service'
import { listInternalRequestsPaginated } from '@/services/requests.service'
import { listMaterialsPaginated, type MaterialsListFilters } from '@/services/inventory-list.service'
import { listLowStockMaterials } from '@/services/inventory.service'
import { fetchPayrollMonthData } from '@/services/payroll.service'
import { listBudgetsPaginated, getBudgetProposalDefaults } from '@/services/budgets.service'
import type { Database } from '@/types/database'
import { useSecretaryAccessSettings } from '@/hooks/useShellQueries'

export {
  useHeaderMetrics,
  useSidebarBadgesQuery,
  useRecentActivities,
  useNotifications,
  useSecretaryAccessSettings,
  useCriticalStockCount,
} from '@/hooks/useShellQueries'

type Client = Database['public']['Tables']['clients']['Row']

export function useExecutiveMetrics() {
  return useQuery({
    queryKey: queryKeys.executiveMetrics,
    queryFn: getExecutiveMetrics,
    staleTime: 180_000,
  })
}

export function useFinancialChart(months = 6, enabled = true) {
  return useQuery({
    queryKey: queryKeys.financialChart(months),
    queryFn: () => getFinancialChart(months),
    enabled,
    staleTime: 180_000,
  })
}

export function useCommercialMetrics() {
  return useQuery({
    queryKey: queryKeys.commercialMetrics,
    queryFn: getCommercialMetrics,
    staleTime: 180_000,
  })
}

export function useOperationalMetrics() {
  const role = useAuthStore((s) => s.profile?.role?.name)
  const { data: secretaryAccess } = useSecretaryAccessSettings()
  const includeLumberCredit = hasModuleAccess(
    role,
    'lumber_credit.read',
    secretaryAccess ?? DEFAULT_SECRETARY_ACCESS,
  )

  return useQuery({
    queryKey: [...queryKeys.operationalMetrics, includeLumberCredit],
    queryFn: () => getOperationalMetrics({ includeLumberCredit }),
    staleTime: 180_000,
  })
}

export function useFinancialDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.financialDashboard,
    queryFn: getFinancialDashboardMetrics,
    staleTime: 180_000,
  })
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: queryKeys.financialSummary,
    queryFn: getFinancialSummary,
    staleTime: 120_000,
  })
}

export function useFinancialSettings() {
  return useQuery({
    queryKey: queryKeys.financialSettings,
    queryFn: getFinancialSettings,
    staleTime: 60_000,
  })
}

export function useFinancialTransactions(page: number, filter: 'all' | 'receita' | 'despesa') {
  return useQuery({
    queryKey: queryKeys.financialTransactions(page, filter),
    queryFn: () => listFinancialTransactions(page, filter),
    placeholderData: keepPreviousData,
  })
}

export function useLumberCreditAllMovements() {
  return useQuery({
    queryKey: queryKeys.lumberCreditAllMovements,
    queryFn: listAllLumberCreditMovementsForStats,
    staleTime: 60_000,
  })
}

export function useLumberCreditStats(clientId?: string) {
  const { data: movements, ...rest } = useLumberCreditAllMovements()
  const stats = useMemo(
    () => (movements ? computeLumberCreditStats(movements, clientId) : undefined),
    [movements, clientId],
  )
  return { ...rest, data: stats }
}

export function useLumberCreditBalancesByClient() {
  return useQuery({
    queryKey: queryKeys.lumberCreditBalancesByClient,
    queryFn: listLumberCreditBalancesByClient,
    staleTime: 60_000,
  })
}

export function useLumberCreditSettings() {
  return useQuery({
    queryKey: queryKeys.lumberCreditSettings,
    queryFn: getLumberCreditSettings,
    staleTime: 60_000,
  })
}

export function useLumberCreditMovements(
  filters: LumberCreditFilters,
  page: number
) {
  return useQuery({
    queryKey: queryKeys.lumberCreditMovements(filters as Record<string, unknown>, page),
    queryFn: () => listLumberCreditMovementsPaginated({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
}

export function useClients(page: number, search: string) {
  return useQuery({
    queryKey: queryKeys.clients(page, search),
    queryFn: () =>
      paginatedQuery<Client>(
        'clients',
        { page, pageSize: PAGE_SIZE, search },
        { searchColumns: ['name', 'email', 'document', 'phone'] }
      ),
    placeholderData: keepPreviousData,
  })
}

export function useLookupClients() {
  return useQuery({ queryKey: queryKeys.lookupClients, queryFn: fetchClientOptions, staleTime: 120_000 })
}

export function useLookupOrders() {
  return useQuery({ queryKey: queryKeys.lookupOrders, queryFn: fetchOrderOptions, staleTime: 120_000 })
}

export function useLookupSuppliers() {
  return useQuery({ queryKey: queryKeys.lookupSuppliers, queryFn: fetchSupplierOptions, staleTime: 120_000 })
}

export function useLookupArchitects() {
  return useQuery({ queryKey: queryKeys.lookupArchitects, queryFn: fetchArchitectOptions, staleTime: 120_000 })
}

export function useLookupMaterials() {
  return useQuery({ queryKey: queryKeys.lookupMaterials, queryFn: fetchMaterialOptions, staleTime: 120_000 })
}

export function useLookupPurchases() {
  return useQuery({ queryKey: queryKeys.lookupPurchases, queryFn: fetchPurchaseOptions, staleTime: 120_000 })
}

export function useLookupEmployeesPayroll() {
  return useQuery({ queryKey: queryKeys.lookupEmployeesPayroll, queryFn: fetchEmployeePayrollOptions, staleTime: 120_000 })
}

export function useCrmLeads() {
  return useQuery({
    queryKey: queryKeys.crmLeads,
    queryFn: fetchEnrichedLeads,
    staleTime: 30_000,
  })
}

export function useOrdersKanban() {
  return useQuery({
    queryKey: queryKeys.ordersKanban,
    queryFn: fetchOrdersKanban,
    staleTime: 30_000,
  })
}

export function usePurchases(page: number) {
  return useQuery({
    queryKey: queryKeys.purchasesPaginated(page),
    queryFn: () => listPurchasesPaginated(page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useProductionOrders() {
  return useQuery({
    queryKey: queryKeys.productionOrders,
    queryFn: listProductionOrders,
    staleTime: 30_000,
  })
}

export function useProductionOrderOptions() {
  return useQuery({
    queryKey: queryKeys.productionOrderOptions,
    queryFn: fetchActiveOrderOptions,
    staleTime: 60_000,
  })
}

export function useEmployees(page: number) {
  return useQuery({
    queryKey: queryKeys.employeesPaginated(page),
    queryFn: () => listEmployeesPaginated(page),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function useLookupEmployeesAll() {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: listEmployees,
    staleTime: 120_000,
  })
}

export function useMarketingInvestments() {
  return useQuery({
    queryKey: queryKeys.marketingInvestments,
    queryFn: listInvestments,
    staleTime: 60_000,
  })
}

export function useMarketingInvestmentsPaginated(
  year: number,
  month: number | 'all',
  page: number
) {
  return useQuery({
    queryKey: queryKeys.marketingInvestmentsPaginated(year, month, page),
    queryFn: () => listInvestmentsPaginated(year, month, page),
    placeholderData: keepPreviousData,
  })
}

export function useInternalRequests(page: number) {
  return useQuery({
    queryKey: queryKeys.internalRequests(page),
    queryFn: () => listInternalRequestsPaginated(page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useMaterials(filters: MaterialsListFilters) {
  return useQuery({
    queryKey: queryKeys.materials(filters as unknown as Record<string, unknown>),
    queryFn: () => listMaterialsPaginated(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useLowStockMaterials() {
  return useQuery({
    queryKey: queryKeys.lowStockMaterials,
    queryFn: listLowStockMaterials,
    staleTime: 60_000,
  })
}

export function usePayrollMonth(referenceMonth: string) {
  return useQuery({
    queryKey: queryKeys.payrollMonth(referenceMonth),
    queryFn: () => fetchPayrollMonthData(referenceMonth),
    staleTime: 30_000,
  })
}

export function useBudgets(page: number) {
  return useQuery({
    queryKey: queryKeys.budgetsPaginated(page),
    queryFn: () => listBudgetsPaginated(page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useBudgetProposalDefaults() {
  return useQuery({
    queryKey: queryKeys.budgetProposalDefaults,
    queryFn: getBudgetProposalDefaults,
    staleTime: 60_000,
  })
}
