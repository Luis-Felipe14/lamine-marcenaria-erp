import { normalizeRole, hasPermission, canAccessDashboard, canAccessReports } from '@/lib/permissions'
import type {
  DashboardSectionKey,
  SecretaryAccessSettings,
  SecretaryModuleKey,
} from '@/services/secretary-access.service'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'

/** Mapa permission string → módulo liberável da secretária */
const PERMISSION_TO_MODULE: Record<string, SecretaryModuleKey> = {
  'dashboard.read': 'dashboard',
  'dashboard.*': 'dashboard',
  'dashboard.operacional': 'dashboard',
  'dashboard.comercial': 'dashboard',
  'dashboard.financeiro': 'dashboard',
  'dashboard.executivo': 'dashboard',
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
  'lumber_credit.read': 'credito_madereira',
  'lumber_credit.*': 'credito_madereira',
  'financial.read': 'financeiro',
  'financial.*': 'financeiro',
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
  '/arquitetos': 'arquitetos',
  '/orcamentos': 'orcamentos',
  '/pedidos': 'pedidos',
  '/producao': 'producao',
  '/estoque': 'estoque',
  '/compras': 'compras',
  '/fornecedores': 'fornecedores',
  '/credito-madereira': 'credito_madereira',
  '/financeiro': 'financeiro',
  '/marketing': 'marketing',
  '/funcionarios': 'funcionarios',
  '/folha': 'folha',
  '/solicitacoes': 'solicitacoes',
  '/relatorios': 'relatorios',
}

const PATH_TO_DASHBOARD_SECTION: Record<string, DashboardSectionKey> = {
  '/': 'executivo',
  '/dashboard/comercial': 'comercial',
  '/dashboard/operacional': 'operacional',
  '/dashboard/financeiro': 'financeiro',
}

export function pathToDashboardSection(path: string): DashboardSectionKey | null {
  if (PATH_TO_DASHBOARD_SECTION[path]) return PATH_TO_DASHBOARD_SECTION[path]
  if (path.startsWith('/dashboard/comercial')) return 'comercial'
  if (path.startsWith('/dashboard/operacional')) return 'operacional'
  if (path.startsWith('/dashboard/financeiro')) return 'financeiro'
  return null
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
  const entry = Object.entries(PATH_TO_MODULE).find(([p]) => p !== '/' && path.startsWith(p))
  return entry?.[1] ?? null
}

function secretaryHasDashboardSection(
  settings: SecretaryAccessSettings,
  section: DashboardSectionKey,
): boolean {
  if (!settings.modules.dashboard) return false
  return Boolean(
    settings.dashboard_sections?.[section] ?? DEFAULT_SECRETARY_ACCESS.dashboard_sections[section],
  )
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
    if (permission.startsWith('settings.')) return false

    const moduleKey = permissionToSecretaryModule(permission)
    if (!moduleKey) return false
    const access = settings ?? DEFAULT_SECRETARY_ACCESS
    if (!access.modules[moduleKey]) return false

    if (permission === 'dashboard.executivo') return secretaryHasDashboardSection(access, 'executivo')
    if (permission === 'dashboard.comercial') return secretaryHasDashboardSection(access, 'comercial')
    if (permission === 'dashboard.operacional') return secretaryHasDashboardSection(access, 'operacional')
    if (permission === 'dashboard.financeiro') return secretaryHasDashboardSection(access, 'financeiro')

    return true
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

  const access = settings ?? DEFAULT_SECRETARY_ACCESS
  const dashboardSection = pathToDashboardSection(path)

  if (normalized === 'secretaria') {
    if (dashboardSection) {
      return secretaryHasDashboardSection(access, dashboardSection)
    }
    const moduleKey = pathToSecretaryModule(path)
    if (!moduleKey) return false
    return Boolean(access.modules[moduleKey])
  }

  const moduleKey = pathToSecretaryModule(path)
  if (!moduleKey) return hasPermission(role, '*')

  const representative: Record<SecretaryModuleKey, string> = {
    dashboard: 'dashboard.read',
    crm: 'crm.read',
    clientes: 'clients.read',
    arquitetos: 'clients.read',
    orcamentos: 'budgets.read',
    pedidos: 'orders.read',
    producao: 'production.read',
    estoque: 'inventory.read',
    compras: 'purchases.read',
    fornecedores: 'purchases.read',
    financeiro: 'financial.read',
    credito_madereira: 'lumber_credit.read',
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
  return false
}

/**
 * Criar/editar/excluir lançamentos no Financeiro.
 * Secretária precisa do módulo financeiro + can_edit_financial.
 */
export function canEditFinancialTransactions(
  role: string | undefined,
  settings: SecretaryAccessSettings | undefined | null,
): boolean {
  const normalized = normalizeRole(role)
  if (!normalized) return false
  if (normalized === 'gestor') return true
  if (normalized === 'secretaria') {
    const modules = settings?.modules ?? DEFAULT_SECRETARY_ACCESS.modules
    return Boolean(modules.financeiro && (settings?.can_edit_financial ?? false))
  }
  return hasPermission(role, 'financial.*') || hasPermission(role, 'financial.write')
}

export function formatCurrencyMasked(
  value: number,
  canView: boolean,
  formatCurrency: (n: number) => string,
): string {
  if (!canView) return '•••'
  return formatCurrency(value)
}
