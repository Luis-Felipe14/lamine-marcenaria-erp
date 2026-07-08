import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_LOGO, APP_BACKGROUND } from '@/lib/branding'
import { APP_NAME, APP_SUBTITLE } from '@/lib/constants'
import { DEFAULT_COMPANY, type CompanyInfo } from '@/lib/export-brand'
import {
  DEFAULT_COMMERCIAL_TERMS,
  DEFAULT_ENTRADA_PERCENT,
  DEFAULT_INCLUDED_ITEMS,
  DEFAULT_INSTALLATION_TIMELINE,
  DEFAULT_MANUFACTURING_TIMELINE,
  PROPOSAL_VALIDITY_DAYS,
  computeValidityDate,
  formatClientAddress,
} from '@/pdf/defaults'
import type { BudgetProposalData, BudgetProposalTemplateId } from '@/pdf/types'

function resolveAbsoluteUrl(path: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

async function fetchCompanyInfo(supabase: SupabaseClient): Promise<CompanyInfo> {
  const { data } = await supabase.from('settings').select('value').eq('key', 'company').maybeSingle()
  const value = data?.value as Partial<CompanyInfo> | undefined
  if (!value?.name) return DEFAULT_COMPANY
  return {
    name: value.name || DEFAULT_COMPANY.name,
    document: value.document,
    phone: value.phone,
    email: value.email,
    address: value.address,
  }
}

function parseTemplateId(value: string | null | undefined): BudgetProposalTemplateId {
  if (value === 'classic' || value === 'executive' || value === 'premium') return value
  return 'premium'
}

export async function loadBudgetProposalData(
  supabase: SupabaseClient,
  budgetId: string,
  options: { baseUrl?: string } = {},
): Promise<BudgetProposalData> {
  const baseUrl = options.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  const [{ data: budget, error: budgetError }, company] = await Promise.all([
    supabase
      .from('budgets')
      .select(`
        *,
        client:clients(name, document, phone, whatsapp, email, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip),
        responsible:users!responsible_id(full_name)
      `)
      .eq('id', budgetId)
      .is('deleted_at', null)
      .single(),
    fetchCompanyInfo(supabase),
  ])

  if (budgetError) {
    throw new Error(budgetError.message || 'Erro ao carregar orçamento')
  }
  if (!budget) throw new Error('Orçamento não encontrado')

  const [{ data: environments, error: envError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from('budget_environments').select('*').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('budget_items').select('id, environment_id, description, material, quantity, unit_price, total_price').eq('budget_id', budgetId).order('created_at'),
  ])

  if (envError) {
    throw new Error(envError.message || 'Erro ao carregar ambientes do orçamento')
  }
  if (itemsError) {
    throw new Error(itemsError.message || 'Erro ao carregar itens do orçamento')
  }

  const itemRows = items ?? []
  const envRows = environments ?? []

  const proposalEnvironments = envRows.length > 0
    ? envRows.map((env) => {
        const envItems = itemRows.filter((item) => item.environment_id === env.id)
        return {
          name: env.name,
          description: (env as { description?: string | null }).description?.trim() || undefined,
          imageUrl: (env as { image_url?: string | null }).image_url?.trim() || undefined,
          value: Number(env.subtotal),
          items: envItems.map((item) => ({
            description: item.description,
            specifications: item.material?.trim() || undefined,
            value: Number(item.total_price) || Number(item.quantity) * Number(item.unit_price),
          })),
        }
      })
    : [{
        name: budget.environment?.trim() || 'Projeto',
        value: Number(budget.total_value) + Number(budget.discount ?? 0),
        items: itemRows.map((item) => ({
          description: item.description,
          specifications: item.material?.trim() || undefined,
          value: Number(item.total_price) || Number(item.quantity) * Number(item.unit_price),
        })),
      }]

  const client = budget.client as {
    name: string
    document?: string | null
    phone?: string | null
    whatsapp?: string | null
    email?: string | null
    address_street?: string | null
    address_number?: string | null
    address_complement?: string | null
    address_neighborhood?: string | null
    address_city?: string | null
    address_state?: string | null
    address_zip?: string | null
  } | null

  const responsible = budget.responsible as { full_name?: string | null } | null
  const environmentsTotal = proposalEnvironments.reduce((sum, env) => sum + env.value, 0)
  const discount = Number(budget.discount ?? 0)
  const totalValue = Math.max(0, environmentsTotal - discount)

  const budgetRow = budget as {
    number: number
    date: string
    project_name: string
    measurements?: string | null
    notes?: string | null
    commercial_terms?: string | null
    entrada_percent?: number | null
    manufacturing_timeline?: string | null
    installation_timeline?: string | null
    proposal_template?: string | null
  }

  return {
    templateId: parseTemplateId(budgetRow.proposal_template),
    company: {
      name: company.name || `${APP_NAME} ${APP_SUBTITLE}`,
      document: company.document,
      phone: company.phone,
      email: company.email,
      address: company.address,
      logoUrl: resolveAbsoluteUrl(APP_LOGO.primary, baseUrl),
      headerImageUrl: resolveAbsoluteUrl(APP_BACKGROUND.optionalPhoto, baseUrl),
    },
    budget: {
      number: budgetRow.number,
      date: budgetRow.date,
      validityDate: computeValidityDate(budgetRow.date),
      validityDays: PROPOSAL_VALIDITY_DAYS,
      projectName: budgetRow.project_name,
      measurements: budgetRow.measurements?.trim() || undefined,
      discount,
      totalValue,
      observations: budgetRow.notes?.trim() || undefined,
      commercialTerms: budgetRow.commercial_terms?.trim() || DEFAULT_COMMERCIAL_TERMS,
      entradaPercent: Number(budgetRow.entrada_percent ?? DEFAULT_ENTRADA_PERCENT),
      manufacturingTimeline: budgetRow.manufacturing_timeline?.trim() || DEFAULT_MANUFACTURING_TIMELINE,
      installationTimeline: budgetRow.installation_timeline?.trim() || DEFAULT_INSTALLATION_TIMELINE,
      responsibleName: responsible?.full_name?.trim() || undefined,
      includedItems: DEFAULT_INCLUDED_ITEMS,
    },
    client: {
      name: client?.name ?? 'Cliente',
      document: client?.document ?? undefined,
      phone: client?.whatsapp || client?.phone || undefined,
      email: client?.email ?? undefined,
      address: client ? formatClientAddress(client) : undefined,
    },
    environments: proposalEnvironments,
  }
}
