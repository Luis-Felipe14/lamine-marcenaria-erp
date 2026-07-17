import { useAuthStore } from '@/stores/authStore'
import { useSecretaryAccessSettings } from '@/hooks/useQueries'
import {
  canViewMonetaryAmounts,
  hasModuleAccess,
  hasPathAccess,
} from '@/lib/secretary-access'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'

/** Hook conveniente: settings + checagens para o usuário logado */
export function useSecretaryAccess() {
  const role = useAuthStore((s) => s.profile?.role?.name)
  const { data: settings, isLoading } = useSecretaryAccessSettings()
  const access = settings ?? DEFAULT_SECRETARY_ACCESS

  return {
    role,
    settings: access,
    isLoading,
    canViewAmounts: canViewMonetaryAmounts(role, access),
    canAccessPermission: (permission: string) => hasModuleAccess(role, permission, access),
    canAccessPath: (path: string) => hasPathAccess(role, path, access),
  }
}
