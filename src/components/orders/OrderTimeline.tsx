import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Package, RefreshCw, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OrderTimelineEvent } from '@/services/orders.service'

const TYPE_CONFIG: Record<
  OrderTimelineEvent['type'],
  { icon: typeof ShoppingCart; label: string; variant: 'default' | 'info' | 'secondary' }
> = {
  budget: { icon: FileText, label: 'Orçamento', variant: 'info' },
  order_created: { icon: ShoppingCart, label: 'Pedido', variant: 'default' },
  status_change: { icon: RefreshCw, label: 'Status', variant: 'secondary' },
  production_order: { icon: Package, label: 'Produção', variant: 'default' },
}

interface OrderTimelineProps {
  events: OrderTimelineEvent[]
  loading?: boolean
}

export function OrderTimeline({ events, loading }: OrderTimelineProps) {
  if (loading) {
    return <p className="text-sm text-gray-500">Carregando histórico...</p>
  }

  if (events.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum evento registrado.</p>
  }

  return (
    <div className="relative space-y-0 pl-1">
      {events.map((event, index) => {
        const config = TYPE_CONFIG[event.type]
        const Icon = config.icon
        const eventDate = new Date(event.date)
        const dateLabel = Number.isNaN(eventDate.getTime())
          ? '—'
          : format(eventDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

        return (
          <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < events.length - 1 && (
              <span className="absolute left-[13px] top-7 bottom-0 w-px bg-white/10" aria-hidden />
            )}
            <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
              <Icon className="h-3.5 w-3.5 text-gold" />
            </div>
            <div className="min-w-0 flex-1 rounded-lg bg-surface-elevated px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="text-xs text-gray-500">{dateLabel}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-white">{event.title}</p>
              {event.description && (
                <p className="mt-0.5 text-xs text-gray-400">{event.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
