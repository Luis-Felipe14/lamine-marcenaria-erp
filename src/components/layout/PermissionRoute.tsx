import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission, normalizeRole } from '@/lib/permissions'
import { hasPathAccess, pathToDashboardSection } from '@/lib/secretary-access'
import { getAccessibleDashboardSections } from '@/lib/dashboard-access'
import { useSecretaryAccessSettings } from '@/hooks/useShellQueries'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'
import type { UserRole } from '@/types'

interface PermissionRouteProps {
  permission: string
  children: React.ReactNode
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const { pathname } = useLocation()
  const { data: secretaryAccess } = useSecretaryAccessSettings()
  const settings = secretaryAccess ?? DEFAULT_SECRETARY_ACCESS

  let allowed = false

  if (permission.startsWith('settings.')) {
    allowed = hasPermission(role, permission) || hasPermission(role, '*')
  } else if (permission === 'dashboard.read') {
    const normalized = normalizeRole(role)
    if (normalized === 'secretaria') {
      if (!settings.modules.dashboard) {
        allowed = false
      } else {
        // Em `/` o índice redireciona para a primeira aba liberada
        if (pathname === '/' || pathname === '') {
          allowed = getAccessibleDashboardSections(role, settings).length > 0
        } else {
          const section = pathToDashboardSection(pathname)
          allowed = section
            ? hasPathAccess(role, pathname, settings)
            : getAccessibleDashboardSections(role, settings).length > 0
        }
      }
    } else {
      allowed = hasPermission(role, 'dashboard.read') || hasPermission(role, 'dashboard.*') || hasPermission(role, '*')
    }
  } else {
    allowed = hasPathAccess(role, pathname, settings)
  }

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
