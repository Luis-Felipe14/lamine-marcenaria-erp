import { memo } from 'react'
import { User, Calendar, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatRelativeDate, getLeadPriority } from '@/lib/utils'

export interface EnrichedLead {
  id: string
  name: string
  status: string
  estimated_value: number
  origin: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  architect_id?: string | null
  architect?: { name: string } | null
  client?: { name: string } | null
  responsible?: { full_name: string } | null
  last_contact?: string | null
  environment?: string | null
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export const LeadKanbanCard = memo(function LeadKanbanCard({ lead }: { lead: EnrichedLead }) {
  const priority = getLeadPriority(lead.estimated_value)
  const clientName = lead.client?.name ?? lead.name

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold ring-1 ring-gold/20">
          {getInitials(clientName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white light:text-gray-900">{clientName}</p>
              {lead.client && lead.name !== lead.client.name && (
                <p className="truncate text-[11px] text-gray-500">{lead.name}</p>
              )}
            </div>
            <Badge variant={priority.variant} className="shrink-0 text-[10px]">
              {priority.label}
            </Badge>
          </div>
        </div>
      </div>

      {lead.estimated_value > 0 && (
        <div className="rounded-lg bg-gold/8 px-2.5 py-1.5 text-sm font-semibold text-gold">
          {formatCurrency(lead.estimated_value)}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {lead.origin && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] text-gray-400">
            {lead.origin}
          </span>
        )}
        {lead.environment && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] text-gray-400">
            {lead.environment}
          </span>
        )}
        {lead.architect?.name && (
          <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-[10px] text-gray-400">
            Arq. {lead.architect.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1.5 border-t border-border/40 pt-2.5 text-[11px] text-gray-500">
        {lead.responsible?.full_name && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.responsible.full_name}</span>
          </div>
        )}
        {(lead.phone || lead.whatsapp) && (
          <div className="flex items-center gap-1.5 truncate">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.whatsapp ?? lead.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{lead.last_contact ? formatRelativeDate(lead.last_contact) : 'Sem interação'}</span>
        </div>
      </div>
    </div>
  )
})
