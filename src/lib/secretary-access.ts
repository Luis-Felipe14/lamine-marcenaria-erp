import { normalizeRole, hasPermission, canAccessDashboard, canAccessReports } from '@/lib/permissions'
import type { SecretaryAccessSettings, SecretaryModuleKey } from '@/services/secretary-access.service'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'

/** Mapa permission string → módulo liberável da secretária */
const PERMISSION_TO_MODULE: Record<string, SecretaryModuleKey> = {
  'dashboard.read': 'dashboard',
  'dashboard.*': 'dashboard',
  'dashboard.operacional': 'dashboard',
  'dashboard.comercial': 'dashboard',
  'dashboard.financeiro': 'dashboard',
  'crm.read': 'crm',
  'crm.*': 'crm',
  'clients.read': 'clientes',
  'clients.*': 'clientes',
  'budgets.read': 'orcamentos',
  'budgets.*': 'orcamentos',
  'orders.read': 'pedidos',
  'orders.*': 'pedidos',
  'production.read': 'producao',
  'production.*': 'producao',
  'inventory.read': 'estoque',
  'inventory.*': 'estoque',
  'purchases.read': 'compras',
  'purchases.*': 'compras',
  'lumber_credit.read': 'financeiro_madereira',
  'lumber_credit.*': 'financeiro_madereira',
  'financial.read': 'financeiro_madereira',
  'financial.*': 'financeiro_madereira',
  'marketing.read': 'marketing',
  'marketing.*': 'marketing',
  'employees.read': 'funcionarios',
  'employees.*': 'funcionarios',
  'payroll.read': 'folha',
  'payroll.*': 'folha',
  'requests.read': 'solicitacoes',
  'requests.*': 'solicitacoes',
  'reports.read': 'relatorios',
  'reports.*': 'relatorios',
}

const PATH_TO_MODULE: Record<string, SecretaryModuleKey> = {
  '/': 'dashboard',
  '/dashboard/comercial': 'dashboard',
  '/dashboard/operacional': 'dashboard',
  '/dashboard/financeiro': 'dashboard',
  '/crm': 'crm',
  '/clientes': 'clientes',
  '/arquitetos': 'clientes',
  '/orcamentos': 'orcamentos',
  '/pedidos': 'pedidos',
  '/producao': 'producao',
  '/estoque': 'estoque',
  '/compras': 'compras',
  '/fornecedores': 'compras',
  '/credito-madereira': 'financeiro_madereira',
  '/financeiro': 'financeiro_madereira',
  '/marketing': 'marketing',
  '/funcionarios': 'funcionarios',
  '/folha': 'folha',
  '/solicitacoes': 'solicitacoes',
  '/relatorios': 'relatorios',
}

export function permissionToSecretaryModule(permission: string): SecretaryModuleKey | null {
  if (PERMISSION_TO_MODULE[permission]) return PERMISSION_TO_MODULE[permission]
  const [mod] = permission.split('.')
  const readKey = `${mod}.read`
  const starKey = `${mod}.*`
  return PERMISSION_TO_MODULE[readKey] ?? PERMISSION_TO_MODULE[starKey] ?? null
}

export function pathToSecretaryModule(path: string): SecretaryModuleKey | null {
  if (PATH_TO_MODULE[path]) return PATH_TO_MODULE[path]
  // Match prefix for nested paths
  const entry = Object.entries(PATH_TO_MODULE).find(([p]) => p !== '/' && path.startsWith(p))
  return entry?.[1] ?? null
}

/**
 * Acesso a módulo para nav/rotas.
 * Secretária: apenas o que estiver ligado em settings.
 * Demais perfis: ROLE_PERMISSIONS (comportamento atual).
 */
export function hasModuleAccess(
  role: string | undefined,
  permission: string,
  settings: SecretaryAccessSettings | undefined | null,
): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false

  if (normalized === 'secretaria') {
    // Configurações nunca liberadas pela UI de módulos
    if (permission.startsWith('settings.')) return false

    const moduleKey = permissionToSecretaryModule(permission)
    if (!moduleKey) return false
    const modules = settings?.modules ?? DEFAULT_SECRETARY_ACCESS.modules
    return Boolean(modules[moduleKey])
  }

  if (permission === 'dashboard.read') return canAccessDashboard(role)
  if (permission === 'reports.read') return canAccessReports(role)
  return hasPermission(role, permission)
}

export function hasPathAccess(
  role: string | undefined,
  path: string,
  settings: SecretaryAccessSettings | undefined | null,
): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false

  if (path === '/configuracoes') {
    return hasPermission(role, 'settings.read') || hasPermission(role, '*')
  }

  if (normalized === 'secretaria') {
    const moduleKey = pathToSecretaryModule(path)
    if (!moduleKey) return false
    const modules = settings?.modules ?? DEFAULT_SECRETARY_ACCESS.modules
    return Boolean(modules[moduleKey])
  }

  // Demais: resolve permission pelo path conhecido
  const moduleKey = pathToSecretaryModule(path)
  if (!moduleKey) return hasPermission(role, '*')
  // Reuse ROLE via a representative permission
  const representative: Record<SecretaryModuleKey, string> = {
    dashboard: 'dashboard.read',
    crm: 'crm.read',
    clientes: 'clients.read',
    orcamentos: 'budgets.read',
    pedidos: 'orders.read',
    producao: 'production.read',
    estoque: 'inventory.read',
    compras: 'purchases.read',
    financeiro_madereira: path.includes('credito') ? 'lumber_credit.read' : 'financial.read',
    marketing: 'marketing.read',
    funcionarios: 'employees.read',
    folha: 'payroll.read',
    solicitacoes: 'requests.read',
    relatorios: 'reports.read',
  }
  return hasPermission(role, representative[moduleKey])
}

/** Gestor sempre vê valores; secretária só com can_view_amounts. */
export function canViewMonetaryAmounts(
  role: string | undefined,
  settings: SecretaryAccessSettings | undefined | null,
): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  if (normalized === 'gestor') return true
  if (normalized === 'secretaria') {
    return Boolean(settings?.can_view_amounts ?? DEFAULT_SECRETARY_ACCESS.can_view_amounts)
  }
  // Produção: sem acesso financeiro típico; se chegar a tela, não mostra valores
  return false
}

export function formatCurrencyMasked(
  value: number,
  canView: boolean,
  formatCurrency: (n: number) => string,
): string {
  if (!canView) return '•••'
  return formatCurrency(value)
}
