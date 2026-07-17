import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { hasModuleAccess } from '@/lib/secretary-access'
import { useSecretaryAccessSettings } from '@/hooks/useQueries'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'
import type { UserRole } from '@/types'

interface PermissionRouteProps {
  permission: string
  children: React.ReactNode
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const { data: secretaryAccess } = useSecretaryAccessSettings()
  const settings = secretaryAccess ?? DEFAULT_SECRETARY_ACCESS

  const allowed =
    permission.startsWith('settings.')
      ? hasPermission(role, permission) || hasPermission(role, '*')
      : hasModuleAccess(role, permission, settings)

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
