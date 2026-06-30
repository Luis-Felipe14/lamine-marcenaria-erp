import { supabase } from '@/lib/supabase'
import type { EnrichedLead } from '@/components/crm/LeadKanbanCard'
import type { Database } from '@/types/database'

type LeadRow = Database['public']['Tables']['leads']['Row']

async function fetchRawLeads(): Promise<LeadRow[]> {
  const embedded = await supabase
    .from('leads')
    .select('*, client:clients(name), responsible:users!responsible_id(full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!embedded.error) return embedded.data ?? []

  const fallback = await supabase
    .from('leads')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (fallback.error) throw fallback.error
  return fallback.data ?? []
}

export async function fetchEnrichedLeads(): Promise<EnrichedLead[]> {
  const rawLeads = await fetchRawLeads()
  const leadIds = rawLeads.map((l) => l.id)
  const responsibleIds = [...new Set(rawLeads.map((l) => l.responsible_id).filter(Boolean))] as string[]
  const clientIds = [...new Set(rawLeads.map((l) => l.client_id).filter(Boolean))] as string[]

  const [contacts, budgets, usersRes, clientsRes] = await Promise.all([
    leadIds.length > 0
      ? supabase.from('lead_contact_history').select('lead_id, contact_date').in('lead_id', leadIds).order('contact_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    leadIds.length > 0
      ? supabase.from('budgets').select('lead_id, environment').in('lead_id', leadIds).is('deleted_at', null)
      : Promise.resolve({ data: [] }),
    responsibleIds.length > 0
      ? supabase.from('users').select('id, full_name').in('id', responsibleIds)
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? supabase.from('clients').select('id, name').in('id', clientIds)
      : Promise.resolve({ data: [] }),
  ])

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]))
  const clientMap = new Map((clientsRes.data ?? []).map((c) => [c.id, c.name]))

  const lastContactMap = new Map<string, string>()
  for (const c of contacts.data ?? []) {
    if (!lastContactMap.has(c.lead_id)) lastContactMap.set(c.lead_id, c.contact_date)
  }

  const envMap = new Map<string, string>()
  for (const b of budgets.data ?? []) {
    if (b.lead_id && b.environment && !envMap.has(b.lead_id)) envMap.set(b.lead_id, b.environment)
  }

  return rawLeads.map((l) => {
    const embedded = l as LeadRow & {
      client?: { name: string } | null
      responsible?: { full_name: string } | null
    }

    return {
      id: l.id,
      name: l.name,
      status: l.status,
      estimated_value: l.estimated_value,
      origin: l.origin,
      phone: l.phone,
      whatsapp: l.whatsapp,
      email: l.email,
      client: embedded.client ?? (l.client_id ? { name: clientMap.get(l.client_id) ?? l.name } : null),
      responsible: embedded.responsible ?? (l.responsible_id ? { full_name: userMap.get(l.responsible_id) ?? 'Sem responsável' } : null),
      last_contact: lastContactMap.get(l.id) ?? null,
      environment: envMap.get(l.id) ?? l.notes?.slice(0, 60) ?? null,
    }
  })
}
