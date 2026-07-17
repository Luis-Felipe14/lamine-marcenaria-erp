import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'
import { getFinancialSettings } from '@/services/financial.service'

export const SECRETARY_MODULE_KEYS = [
  'dashboard',
  'crm',
  'clientes',
  'arquitetos',
  'orcamentos',
  'pedidos',
  'producao',
  'estoque',
  'compras',
  'fornecedores',
  'financeiro',
  'credito_madereira',
  'marketing',
  'funcionarios',
  'folha',
  'solicitacoes',
  'relatorios',
] as const

export type SecretaryModuleKey = (typeof SECRETARY_MODULE_KEYS)[number]

export const DASHBOARD_SECTION_KEYS = [
  'executivo',
  'comercial',
  'operacional',
  'financeiro',
] as const

export type DashboardSectionKey = (typeof DASHBOARD_SECTION_KEYS)[number]

export interface SecretaryAccessSettings {
  modules: Record<SecretaryModuleKey, boolean>
  can_view_amounts: boolean
  /** Subliberação: criar/editar/excluir lançamentos no Financeiro */
  can_edit_financial: boolean
  /** Subliberações das abas do Dashboard Geral */
  dashboard_sections: Record<DashboardSectionKey, boolean>
}

/** Labels amigáveis para a UI de Configurações */
export const SECRETARY_MODULE_LABELS: Record<SecretaryModuleKey, string> = {
  dashboard: 'Dashboard Geral',
  crm: 'CRM',
  clientes: 'Clientes',
  arquitetos: 'Arquitetos',
  orcamentos: 'Orçamentos',
  pedidos: 'Pedidos',
  producao: 'Produção',
  estoque: 'Estoque',
  compras: 'Compras',
  fornecedores: 'Fornecedores',
  financeiro: 'Financeiro',
  credito_madereira: 'Crédito Madeireira',
  marketing: 'Inv. Marketing',
  funcionarios: 'Funcionários',
  folha: 'Folha e Recibos',
  solicitacoes: 'Solicitações',
  relatorios: 'Relatórios',
}

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionKey, string> = {
  executivo: 'Executivo',
  comercial: 'Comercial',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
}

/** Defaults = acesso atual da secretária em ROLE_PERMISSIONS */
export const DEFAULT_SECRETARY_MODULES: Record<SecretaryModuleKey, boolean> = {
  dashboard: true,
  crm: false,
  clientes: false,
  arquitetos: false,
  orcamentos: false,
  pedidos: true,
  producao: true,
  estoque: true,
  compras: true,
  fornecedores: true,
  financeiro: true,
  credito_madereira: true,
  marketing: false,
  funcionarios: true,
  folha: true,
  solicitacoes: true,
  relatorios: true,
}

/** Defaults alinhados ao que a secretária já via nas abas do dashboard */
export const DEFAULT_DASHBOARD_SECTIONS: Record<DashboardSectionKey, boolean> = {
  executivo: false,
  comercial: false,
  operacional: true,
  financeiro: true,
}

export const DEFAULT_SECRETARY_ACCESS: SecretaryAccessSettings = {
  modules: { ...DEFAULT_SECRETARY_MODULES },
  can_view_amounts: false,
  can_edit_financial: false,
  dashboard_sections: { ...DEFAULT_DASHBOARD_SECTIONS },
}

/** Compat com chaves agrupadas da versão anterior */
function migrateLegacyModules(
  partial?: Partial<Record<string, boolean>>,
): Partial<Record<SecretaryModuleKey, boolean>> {
  if (!partial) return {}
  const next: Partial<Record<SecretaryModuleKey, boolean>> = {}

  for (const key of SECRETARY_MODULE_KEYS) {
    if (typeof partial[key] === 'boolean') next[key] = partial[key]
  }

  if (typeof partial.financeiro_madereira === 'boolean') {
    if (typeof next.financeiro !== 'boolean') next.financeiro = partial.financeiro_madereira
    if (typeof next.credito_madereira !== 'boolean') next.credito_madereira = partial.financeiro_madereira
  }

  return next
}

function mergeModules(
  partial?: Partial<Record<string, boolean>>,
): Record<SecretaryModuleKey, boolean> {
  const modules = { ...DEFAULT_SECRETARY_MODULES }
  const migrated = migrateLegacyModules(partial)
  for (const key of SECRETARY_MODULE_KEYS) {
    if (typeof migrated[key] === 'boolean') modules[key] = migrated[key]!
  }
  return modules
}

function mergeDashboardSections(
  partial?: Partial<Record<DashboardSectionKey, boolean>>,
): Record<DashboardSectionKey, boolean> {
  const sections = { ...DEFAULT_DASHBOARD_SECTIONS }
  if (!partial) return sections
  for (const key of DASHBOARD_SECTION_KEYS) {
    if (typeof partial[key] === 'boolean') sections[key] = partial[key]!
  }
  return sections
}

export async function getSecretaryAccessSettings(): Promise<SecretaryAccessSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'secretary_access')
    .maybeSingle()

  throwIfError(error, 'acesso da secretária')

  const value = data?.value as Partial<SecretaryAccessSettings> & {
    modules?: Partial<Record<string, boolean>>
  } | undefined

  let canViewAmounts = value?.can_view_amounts
  if (typeof canViewAmounts !== 'boolean') {
    try {
      const financial = await getFinancialSettings()
      canViewAmounts = financial.secretary_can_view_summary
    } catch {
      canViewAmounts = DEFAULT_SECRETARY_ACCESS.can_view_amounts
    }
  }

  return {
    modules: mergeModules(value?.modules),
    can_view_amounts: canViewAmounts ?? false,
    can_edit_financial: value?.can_edit_financial ?? DEFAULT_SECRETARY_ACCESS.can_edit_financial,
    dashboard_sections: mergeDashboardSections(value?.dashboard_sections),
  }
}

export async function saveSecretaryAccessSettings(settings: SecretaryAccessSettings): Promise<void> {
  const payload = {
    key: 'secretary_access',
    value: {
      modules: mergeModules(settings.modules),
      can_view_amounts: Boolean(settings.can_view_amounts),
      can_edit_financial: Boolean(settings.can_edit_financial),
      dashboard_sections: mergeDashboardSections(settings.dashboard_sections),
    } satisfies SecretaryAccessSettings,
  }

  const { data: existing, error: loadError } = await supabase
    .from('settings')
    .select('id')
    .eq('key', 'secretary_access')
    .maybeSingle()

  throwIfError(loadError, 'acesso da secretária')

  const { error } = existing
    ? await supabase.from('settings').update({ value: payload.value }).eq('key', 'secretary_access')
    : await supabase.from('settings').insert(payload)

  throwIfError(error, 'salvar acesso da secretária')
}
