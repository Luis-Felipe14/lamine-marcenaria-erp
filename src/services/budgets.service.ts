import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery, createRecord, updateRecord } from '@/services/api'
import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'
import {
  DEFAULT_COMMERCIAL_TERMS,
  DEFAULT_INSTALLATION_TIMELINE,
  DEFAULT_MANUFACTURING_TIMELINE,
} from '@/pdf/defaults'

export interface Budget {
  id: string
  number: number
  client_id: string
  project_name: string
  environment: string | null
  total_value: number
  status: string
  date: string
  client?: { name: string }
}

export interface BudgetProposalDefaults {
  commercial_terms: string
  manufacturing_timeline: string
  installation_timeline: string
}

export const FALLBACK_BUDGET_PROPOSAL_DEFAULTS: BudgetProposalDefaults = {
  commercial_terms: DEFAULT_COMMERCIAL_TERMS,
  manufacturing_timeline: DEFAULT_MANUFACTURING_TIMELINE,
  installation_timeline: DEFAULT_INSTALLATION_TIMELINE,
}

export async function listBudgetsPaginated(page: number, pageSize = PAGE_SIZE) {
  return paginatedQuery<Budget>(
    'budgets',
    { page, pageSize },
    {
      select: '*, client:clients(name)',
      orderBy: { column: 'created_at', ascending: false },
    },
  )
}

export async function getBudgetProposalDefaults(): Promise<BudgetProposalDefaults> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'budget_proposal')
    .maybeSingle()

  throwIfError(error, 'padrões do orçamento')
  const value = data?.value as Partial<BudgetProposalDefaults> | undefined
  return {
    commercial_terms: value?.commercial_terms?.trim() || FALLBACK_BUDGET_PROPOSAL_DEFAULTS.commercial_terms,
    manufacturing_timeline:
      value?.manufacturing_timeline?.trim() || FALLBACK_BUDGET_PROPOSAL_DEFAULTS.manufacturing_timeline,
    installation_timeline:
      value?.installation_timeline?.trim() || FALLBACK_BUDGET_PROPOSAL_DEFAULTS.installation_timeline,
  }
}

export async function saveBudgetProposalDefaults(defaults: BudgetProposalDefaults): Promise<void> {
  const payload = {
    key: 'budget_proposal',
    value: {
      commercial_terms: defaults.commercial_terms.trim(),
      manufacturing_timeline: defaults.manufacturing_timeline.trim(),
      installation_timeline: defaults.installation_timeline.trim(),
    },
  }

  const { data: existing, error: loadError } = await supabase
    .from('settings')
    .select('id')
    .eq('key', 'budget_proposal')
    .maybeSingle()

  throwIfError(loadError, 'padrões do orçamento')

  const { error } = existing
    ? await supabase.from('settings').update({ value: payload.value }).eq('key', 'budget_proposal')
    : await supabase.from('settings').insert(payload)

  throwIfError(error, 'salvar padrões do orçamento')
}

const LEAD_RECIPIENT_PREFIX = 'lead:'

export function isLeadRecipientSelection(value: string): boolean {
  return value.startsWith(LEAD_RECIPIENT_PREFIX)
}

/** Converte seleção do formulário (cliente ou lead) em client_id + lead_id para o orçamento. */
export async function resolveBudgetRecipientSelection(
  selection: string,
): Promise<{ client_id: string; lead_id: string | null }> {
  if (isLeadRecipientSelection(selection)) {
    const leadId = selection.slice(LEAD_RECIPIENT_PREFIX.length)
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, name, phone, whatsapp, email, architect_id, client_id')
      .eq('id', leadId)
      .is('deleted_at', null)
      .maybeSingle()

    throwIfError(error, 'lead')
    if (!lead) throw new Error('Lead não encontrado')

    if (lead.client_id) {
      return { client_id: lead.client_id, lead_id: lead.id }
    }

    const client = await createRecord('clients', {
      name: lead.name,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      email: lead.email,
      architect_id: lead.architect_id ?? null,
    })

    const clientId = (client as { id: string }).id
    await updateRecord('leads', lead.id, { client_id: clientId })

    return { client_id: clientId, lead_id: lead.id }
  }

  return { client_id: selection, lead_id: null }
}
