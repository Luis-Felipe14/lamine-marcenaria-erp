import { hasPermission, normalizeRole } from '@/lib/permissions'
import { hasModuleAccess } from '@/lib/secretary-access'
import type { SecretaryAccessSettings } from '@/services/secretary-access.service'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'
import type { UserRole } from '@/types'

export type DashboardSection = 'executivo' | 'comercial' | 'operacional' | 'financeiro'

const SECTION_PERMISSION: Record<DashboardSection, string> = {
  executivo: 'dashboard.executivo',
  comercial: 'dashboard.comercial',
  operacional: 'dashboard.operacional',
  financeiro: 'dashboard.financeiro',
}

const SECTION_ROLES: Record<DashboardSection, UserRole[]> = {
  executivo: ['gestor'],
  comercial: ['gestor'],
  operacional: ['gestor', 'secretaria', 'producao'],
  financeiro: ['gestor', 'secretaria'],
}

export function canAccessDashboardSection(
  role: string | undefined,
  section: DashboardSection,
  secretarySettings?: SecretaryAccessSettings | null,
): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false

  const settings = secretarySettings ?? DEFAULT_SECRETARY_ACCESS

  if (normalized === 'secretaria') {
    if (section === 'financeiro') {
      return hasModuleAccess(role, 'financial.read', settings)
    }
    if (section === 'operacional' || section === 'executivo') {
      return hasModuleAccess(role, 'dashboard.read', settings)
    }
    if (section === 'comercial') {
      return hasModuleAccess(role, 'crm.read', settings) || hasModuleAccess(role, 'clients.read', settings)
    }
    return false
  }

  if (hasPermission(role, '*') || hasPermission(role, 'dashboard.*')) return true
  if (hasPermission(role, SECTION_PERMISSION[section])) return true
  return SECTION_ROLES[section].includes(normalized) && hasPermission(role, 'dashboard.read')
}

export function getAccessibleDashboardSections(
  role: string | undefined,
  secretarySettings?: SecretaryAccessSettings | null,
): DashboardSection[] {
  const all: DashboardSection[] = ['executivo', 'comercial', 'operacional', 'financeiro']
  return all.filter((s) => canAccessDashboardSection(role, s, secretarySettings))
}

export const DASHBOARD_SECTIONS: { id: DashboardSection; label: string; path: string }[] = [
  { id: 'executivo', label: 'Executivo', path: '/' },
  { id: 'comercial', label: 'Comercial', path: '/dashboard/comercial' },
  { id: 'operacional', label: 'Operacional', path: '/dashboard/operacional' },
  { id: 'financeiro', label: 'Financeiro', path: '/dashboard/financeiro' },
]
