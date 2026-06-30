import { useAuthStore } from '@/stores/authStore'
import { hasPermission, canAccessDashboard, canAccessReports } from '@/lib/permissions'
import type { UserRole } from '@/types'

interface PermissionRouteProps {
  permission: string
  children: React.ReactNode
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined

  const allowed =
    permission === 'dashboard.read'
      ? canAccessDashboard(role)
      : permission === 'reports.read'
        ? canAccessReports(role)
        : hasPermission(role, permission)

  if (!allowed) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-white">Acesso negado</h2>
        <p className="text-sm text-gray-400">Você não tem permissão para acessar este módulo.</p>
      </div>
    )
  }

  return <>{children}</>
}
