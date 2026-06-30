import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { LowStockMaterial } from '@/services/inventory.service'

interface StockAlertsPanelProps {
  items: LowStockMaterial[]
  loading?: boolean
  compact?: boolean
}

export function StockAlertsPanel({ items, loading, compact }: StockAlertsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-gray-500">
        Verificando estoque...
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-medium text-amber-200">
          {items.length} material{items.length !== 1 ? 'is' : ''} com estoque baixo
        </p>
      </div>
      <div className={`space-y-2 ${compact ? 'max-h-36 overflow-y-auto' : ''}`}>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-black/20 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{item.name}</p>
              {item.code && <p className="text-xs text-gray-500">Cód. {item.code}</p>}
            </div>
            <Badge variant="danger" className="shrink-0 tabular-nums">
              {formatQuantity(item.current_stock)} / {formatQuantity(item.min_stock)} {item.unit}
            </Badge>
          </div>
        ))}
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-gray-500">
          Atualize o estoque mínimo no cadastro do material ou registre uma compra em{' '}
          <Link to="/compras" className="text-gold hover:underline">Compras</Link>.
        </p>
      )}
    </div>
  )
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}
