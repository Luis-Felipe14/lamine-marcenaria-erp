import type { UserRole } from '@/types'

/** Perfis ativos no ERP Laminê */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  gestor: ['*'],
  secretaria: [
    'dashboard.read',
    'dashboard.operacional',
    'inventory.*',
    'purchases.*',
    'lumber_credit.*',
    'financial.*',
    'employees.read',
    'payroll.*',
    'orders.read',
    'production.read',
    'reports.read',
    'requests.read',
    'notifications.read',
  ],
  producao: [
    'dashboard.read',
    'dashboard.operacional',
    'production.*',
    'orders.read',
    'requests.*',
    'notifications.read',
  ],
}

/** Compatibilidade com perfis antigos até migration 018 ser aplicada */
const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  administrador: 'gestor',
  gestor_geral: 'gestor',
  comercial: 'gestor',
  marketing: 'gestor',
  financeiro: 'gestor',
  consulta: 'gestor',
  almoxarifado: 'secretaria',
  operacional: 'producao',
}

export function normalizeRole(role: string | undefined): UserRole | undefined {
  if (!role) return undefined
  if (role in ROLE_PERMISSIONS) return role as UserRole
  return LEGACY_ROLE_ALIASES[role]
}

function matchPermission(granted: string, required: string): boolean {
  if (granted === '*') return true
  if (granted === required) return true
  const [gModule, gAction] = granted.split('.')
  const [rModule, rAction] = required.split('.')
  if (gModule === rModule && gAction === '*') return true
  if (gModule === '*' && (gAction === rAction || gAction === '*')) return true
  return false
}

export function hasPermission(role: string | undefined, permission: string): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  const perms = ROLE_PERMISSIONS[normalized] ?? []
  return perms.some((p) => matchPermission(p, permission))
}

export function canAccessModule(role: string | undefined, module: string): boolean {
  return (
    hasPermission(role, `${module}.read`) ||
    hasPermission(role, `${module}.*`) ||
    hasPermission(role, `*.read`)
  )
}

export function canAccessDashboard(role: string | undefined): boolean {
  if (!role) return false
  return hasPermission(role, 'dashboard.read') || hasPermission(role, 'dashboard.*')
}

export function canAccessReports(role: string | undefined): boolean {
  if (!role) return false
  return hasPermission(role, 'reports.read') || hasPermission(role, 'reports.*')
}

export function canManageUsers(role: string | undefined, isSystemAdmin = false): boolean {
  return isSystemAdmin || hasPermission(role, 'settings.write') || hasPermission(role, '*')
}

export function canManageEmployees(role: string | undefined): boolean {
  return hasPermission(role, 'employees.write') || hasPermission(role, 'employees.*') || hasPermission(role, '*')
}

export function canManagePayroll(role: string | undefined): boolean {
  return hasPermission(role, 'payroll.write') || hasPermission(role, 'payroll.*') || hasPermission(role, '*')
}

export function canManageSettings(role: string | undefined): boolean {
  return hasPermission(role, '*') || hasPermission(role, 'settings.write')
}
