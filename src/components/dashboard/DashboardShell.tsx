import { Suspense } from 'react'
import { NavLink } from 'react-router-dom'
import { PageTransition } from '@/components/layout/PageTransition'
import { LayoutDashboard, Target, Factory, Wallet } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { DASHBOARD_SECTIONS, getAccessibleDashboardSections, type DashboardSection } from '@/lib/dashboard-access'
import { QuickActions } from '@/components/shared/QuickActions'
import { ActivityCenter } from '@/components/shared/ActivityCenter'
import { Skeleton } from '@/components/ui/skeleton'
import { useUIStore } from '@/stores/uiStore'
import { useSecretaryAccessSettings } from '@/hooks/useShellQueries'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

const TAB_ICONS: Record<DashboardSection, typeof LayoutDashboard> = {
  executivo: LayoutDashboard,
  comercial: Target,
  operacional: Factory,
  financeiro: Wallet,
}

export function DashboardShell() {
  const headerKpisVisible = useUIStore((s) => s.headerKpisVisible)
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const { data: secretaryAccess } = useSecretaryAccessSettings()
  const accessible = getAccessibleDashboardSections(role, secretaryAccess ?? DEFAULT_SECRETARY_ACCESS)
  const tabs = DASHBOARD_SECTIONS.filter((s) => accessible.includes(s.id))

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl light:text-gray-900">
            Central de <span className="text-gradient-gold">Inteligência</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Visão estratégica em tempo real da operação Laminê
          </p>
        </div>
        <QuickActions />
      </div>

      {tabs.length > 1 && (
        <nav className="dashboard-tabs-bar premium-card flex overflow-x-auto" aria-label="Seções do dashboard">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id]
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.path === '/'}
                className={({ isActive }) =>
                  cn('dashboard-tab flex items-center gap-2 whitespace-nowrap px-4', isActive && 'dashboard-tab-active')
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </NavLink>
            )
          })}
        </nav>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          <Suspense fallback={
            <div className="space-y-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          }>
            <PageTransition />
          </Suspense>
        </div>
        <div className="min-w-0">
          <ActivityCenter
            className={cn(
              'xl:sticky xl:sticky-below-header',
              !headerKpisVisible && 'xl:sticky-below-header-no-kpi'
            )}
          />
        </div>
      </div>
    </div>
  )
}
