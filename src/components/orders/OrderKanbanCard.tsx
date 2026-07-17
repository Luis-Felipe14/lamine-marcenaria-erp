import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatCurrencyMasked } from '@/lib/secretary-access'
import { useSecretaryAccess } from '@/hooks/useSecretaryAccess'
import type { KanbanOrder } from '@/services/orders.service'

function isLate(order: KanbanOrder) {
  return (
    order.deadline &&
    new Date(order.deadline) < new Date() &&
    !['finalizado', 'cancelado'].includes(order.status)
  )
}

export const OrderKanbanCard = memo(function OrderKanbanCard({ order }: { order: KanbanOrder }) {
  const { canViewAmounts } = useSecretaryAccess()

  return (
    <div>
      <div className="flex items-start justify-between">
        <span className="font-medium">#{order.number}</span>
        {isLate(order) && <Badge variant="danger">Atrasado</Badge>}
      </div>
      <p className="mt-1 text-sm text-gray-400">{order.client?.name}</p>
      <p className="mt-1 text-xs text-gold">
        {formatCurrencyMasked(order.value, canViewAmounts, formatCurrency)}
      </p>
      {order.deadline && <p className="mt-1 text-xs text-gray-500">Prazo: {formatDate(order.deadline)}</p>}
    </div>
  )
})
