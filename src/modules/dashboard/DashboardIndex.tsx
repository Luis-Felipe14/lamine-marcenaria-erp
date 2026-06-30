import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { DASHBOARD_SECTIONS, getAccessibleDashboardSections } from '@/lib/dashboard-access'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRole } from '@/types'

const ExecutiveDashboard = lazy(() =>
  import('./ExecutiveDashboard').then((m) => ({ default: m.ExecutiveDashboard }))
)

function DashboardLoader() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export function DashboardIndex() {
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const accessible = getAccessibleDashboardSections(role)

  if (accessible.includes('executivo')) {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <ExecutiveDashboard />
      </Suspense>
    )
  }

  const first = DASHBOARD_SECTIONS.find((s) => accessible.includes(s.id))
  if (first && first.path !== '/') {
    return <Navigate to={first.path} replace />
  }

  return (
    <Suspense fallback={<DashboardLoader />}>
      <ExecutiveDashboard />
    </Suspense>
  )
}
