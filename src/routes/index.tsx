import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PermissionRoute } from '@/components/layout/PermissionRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

const LoginPage = lazy(() => import('@/modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const ResetPasswordPage = lazy(() => import('@/modules/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const DashboardIndex = lazy(() => import('@/modules/dashboard/DashboardIndex').then((m) => ({ default: m.DashboardIndex })))
const CommercialDashboard = lazy(() => import('@/modules/dashboard/CommercialDashboard').then((m) => ({ default: m.CommercialDashboard })))
const OperationalDashboard = lazy(() => import('@/modules/dashboard/OperationalDashboard').then((m) => ({ default: m.OperationalDashboard })))
const FinancialDashboard = lazy(() => import('@/modules/dashboard/FinancialDashboard').then((m) => ({ default: m.FinancialDashboard })))
const CrmPage = lazy(() => import('@/modules/crm/CrmPage').then((m) => ({ default: m.CrmPage })))
const ClientsPage = lazy(() => import('@/modules/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const BudgetsPage = lazy(() => import('@/modules/budgets/BudgetsPage').then((m) => ({ default: m.BudgetsPage })))
const OrdersPage = lazy(() => import('@/modules/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const ProductionPage = lazy(() => import('@/modules/production/ProductionPage').then((m) => ({ default: m.ProductionPage })))
const InventoryPage = lazy(() => import('@/modules/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const PurchasesPage = lazy(() => import('@/modules/purchases/PurchasesPage').then((m) => ({ default: m.PurchasesPage })))
const FinancialPage = lazy(() => import('@/modules/financial/FinancialPage').then((m) => ({ default: m.FinancialPage })))
const MarketingPage = lazy(() => import('@/modules/marketing/MarketingPage').then((m) => ({ default: m.MarketingPage })))
const LumberyardCreditPage = lazy(() => import('@/modules/lumberyard-credit/LumberyardCreditPage').then((m) => ({ default: m.LumberyardCreditPage })))
const EmployeesPage = lazy(() => import('@/modules/employees/EmployeesPage').then((m) => ({ default: m.EmployeesPage })))
const PayrollPage = lazy(() => import('@/modules/payroll/PayrollPage').then((m) => ({ default: m.PayrollPage })))
const RequestsPage = lazy(() => import('@/modules/requests/RequestsPage').then((m) => ({ default: m.RequestsPage })))
const ReportsPage = lazy(() => import('@/modules/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  )
}

function Guarded({ permission, children }: { permission: string; children: React.ReactNode }) {
  return (
    <PermissionRoute permission={permission}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </PermissionRoute>
  )
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/redefinir-senha" element={<ResetPasswordPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route element={<Guarded permission="dashboard.read"><DashboardShell /></Guarded>}>
              <Route index element={<DashboardIndex />} />
              <Route path="dashboard/comercial" element={<CommercialDashboard />} />
              <Route path="dashboard/operacional" element={<OperationalDashboard />} />
              <Route path="dashboard/financeiro" element={<FinancialDashboard />} />
            </Route>
            <Route path="crm" element={<Guarded permission="crm.read"><CrmPage /></Guarded>} />
            <Route path="clientes" element={<Guarded permission="clients.read"><ClientsPage /></Guarded>} />
            <Route path="orcamentos" element={<Guarded permission="budgets.read"><BudgetsPage /></Guarded>} />
            <Route path="pedidos" element={<Guarded permission="orders.read"><OrdersPage /></Guarded>} />
            <Route path="producao" element={<Guarded permission="production.read"><ProductionPage /></Guarded>} />
            <Route path="estoque" element={<Guarded permission="inventory.read"><InventoryPage /></Guarded>} />
            <Route path="compras" element={<Guarded permission="purchases.read"><PurchasesPage /></Guarded>} />
            <Route path="credito-madereira" element={<Guarded permission="lumber_credit.read"><LumberyardCreditPage /></Guarded>} />
            <Route path="financeiro" element={<Guarded permission="financial.read"><FinancialPage /></Guarded>} />
            <Route path="marketing" element={<Guarded permission="marketing.read"><MarketingPage /></Guarded>} />
            <Route path="funcionarios" element={<Guarded permission="employees.read"><EmployeesPage /></Guarded>} />
            <Route path="folha" element={<Guarded permission="payroll.read"><PayrollPage /></Guarded>} />
            <Route path="solicitacoes" element={<Guarded permission="requests.read"><RequestsPage /></Guarded>} />
            <Route path="relatorios" element={<Guarded permission="reports.read"><ReportsPage /></Guarded>} />
            <Route path="configuracoes" element={<Guarded permission="settings.read"><SettingsPage /></Guarded>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
