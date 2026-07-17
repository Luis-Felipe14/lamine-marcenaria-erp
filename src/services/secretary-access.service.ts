import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'
import { getFinancialSettings } from '@/services/financial.service'

export const SECRETARY_MODULE_KEYS = [
  'dashboard',
  'crm',
  'clientes',
  'orcamentos',
  'pedidos',
  'producao',
  'estoque',
  'compras',
  'financeiro_madereira',
  'marketing',
  'funcionarios',
  'folha',
  'solicitacoes',
  'relatorios',
] as const

export type SecretaryModuleKey = (typeof SECRETARY_MODULE_KEYS)[number]

export interface SecretaryAccessSettings {
  modules: Record<SecretaryModuleKey, boolean>
  can_view_amounts: boolean
}

/** Labels amigáveis para a UI de Configurações */
export const SECRETARY_MODULE_LABELS: Record<SecretaryModuleKey, string> = {
  dashboard: 'Dashboard Geral',
  crm: 'CRM',
  clientes: 'Clientes e Arquitetos',
  orcamentos: 'Orçamentos',
  pedidos: 'Pedidos',
  producao: 'Produção',
  estoque: 'Estoque',
  compras: 'Compras e Fornecedores',
  financeiro_madereira: 'Financeiro e Crédito Madeireira',
  marketing: 'Inv. Marketing',
  funcionarios: 'Funcionários',
  folha: 'Folha e Recibos',
  solicitacoes: 'Solicitações',
  relatorios: 'Relatórios',
}

/** Defaults = acesso atual da secretária em ROLE_PERMISSIONS */
export const DEFAULT_SECRETARY_MODULES: Record<SecretaryModuleKey, boolean> = {
  dashboard: true,
  crm: false,
  clientes: false,
  orcamentos: false,
  pedidos: true,
  producao: true,
  estoque: true,
  compras: true,
  financeiro_madereira: true,
  marketing: false,
  funcionarios: true,
  folha: true,
  solicitacoes: true,
  relatorios: true,
}

export const DEFAULT_SECRETARY_ACCESS: SecretaryAccessSettings = {
  modules: { ...DEFAULT_SECRETARY_MODULES },
  can_view_amounts: false,
}

function mergeModules(
  partial?: Partial<Record<SecretaryModuleKey, boolean>>,
): Record<SecretaryModuleKey, boolean> {
  const modules = { ...DEFAULT_SECRETARY_MODULES }
  if (!partial) return modules
  for (const key of SECRETARY_MODULE_KEYS) {
    if (typeof partial[key] === 'boolean') modules[key] = partial[key]!
  }
  return modules
}

export async function getSecretaryAccessSettings(): Promise<SecretaryAccessSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'secretary_access')
    .maybeSingle()

  throwIfError(error, 'acesso da secretária')

  const value = data?.value as Partial<SecretaryAccessSettings> | undefined

  let canViewAmounts = value?.can_view_amounts
  if (typeof canViewAmounts !== 'boolean') {
    // Compat: switch legado "resumo financeiro"
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
  }
}

export async function saveSecretaryAccessSettings(settings: SecretaryAccessSettings): Promise<void> {
  const payload = {
    key: 'secretary_access',
    value: {
      modules: mergeModules(settings.modules),
      can_view_amounts: Boolean(settings.can_view_amounts),
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
