import { memo, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface KanbanColumn<T> {
  id: string
  title: string
  color?: string
  items: T[]
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn<T>[]
  renderCard: (item: T) => React.ReactNode
  onCardClick?: (item: T) => void
  onStatusChange?: (itemId: string, newStatus: string, oldStatus: string) => void
}

function KanbanBoardInner<T extends { id: string; status?: string }>({
  columns,
  renderCard,
  onCardClick,
  onStatusChange,
}: KanbanBoardProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const skipClickRef = useRef(false)

  const handleDrop = (columnId: string) => {
    if (!draggingId || !onStatusChange) return
    const item = columns.flatMap((c) => c.items).find((i) => i.id === draggingId)
    if (!item || item.status === columnId) return
    onStatusChange(draggingId, columnId, item.status ?? columnId)
    setDraggingId(null)
    setDropTarget(null)
  }

  const totalItems = useMemo(
    () => columns.reduce((sum, c) => sum + c.items.length, 0),
    [columns],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{totalItems} itens no pipeline</span>
        <span className="hidden sm:inline">Arraste para mover entre colunas</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:gap-4">
        {columns.map((col) => (
          <div key={col.id} className="min-w-[280px] flex-1 snap-start md:min-w-[300px]">
            <div className="mb-3 flex items-center gap-2 px-1">
              <div className={cn('h-2.5 w-2.5 rounded-full shadow-sm', col.color ?? 'bg-gold')} />
              <h3 className="text-sm font-semibold text-gray-200 light:text-gray-800">{col.title}</h3>
              <span className="ml-auto rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-gray-400 light:bg-gray-100 light:text-gray-700">
                {col.items.length}
              </span>
            </div>
            <div
              className={cn(
                'space-y-2.5 min-h-[240px] rounded-xl border border-border/60 bg-surface-elevated p-2.5 transition-all duration-200',
                dropTarget === col.id && 'ring-2 ring-gold/40 bg-gold/5 border-gold/30'
              )}
              onDragOver={(e) => {
                if (!onStatusChange || !draggingId) return
                e.preventDefault()
                setDropTarget(col.id)
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(col.id)
              }}
            >
              {col.items.map((item, i) => (
                <div
                  key={item.id}
                  draggable={!!onStatusChange}
                  onDragStart={(e) => {
                    if (!onStatusChange) return
                    skipClickRef.current = false
                    setDraggingId(item.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDrag={() => {
                    skipClickRef.current = true
                  }}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setDropTarget(null)
                  }}
                  className={cn(
                    'kanban-card',
                    onStatusChange ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                    draggingId === item.id && 'opacity-40 scale-95',
                    draggingId !== item.id && 'hover-lift'
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => {
                    if (skipClickRef.current) {
                      skipClickRef.current = false
                      return
                    }
                    onCardClick?.(item)
                  }}
                >
                  {renderCard(item)}
                </div>
              ))}
              {col.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-2 h-8 w-8 rounded-full border-2 border-dashed border-gray-700 light:border-gray-300" />
                  <p className="text-xs text-gray-600 light:text-gray-500">Arraste itens aqui</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const KanbanBoard = memo(KanbanBoardInner) as typeof KanbanBoardInner
