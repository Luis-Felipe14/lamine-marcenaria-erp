import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
  span?: 'default' | 'wide' | 'full'
  noPadding?: boolean
  draggable?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: () => void
  isDragging?: boolean
}

export function Widget({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  span = 'default',
  noPadding,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: WidgetProps) {
  return (
    <section
      className={cn(
        'premium-card flex flex-col overflow-hidden transition-opacity duration-200',
        span === 'wide' && 'lg:col-span-2',
        span === 'full' && 'col-span-full',
        isDragging && 'opacity-50',
        className
      )}
      onDragOver={onDragOver}
      onDrop={(e) => { e.preventDefault(); onDrop?.() }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {draggable && (
              <button
                type="button"
                draggable
                onDragStart={onDragStart}
                className="widget-drag-handle -ml-1 shrink-0"
                aria-label="Reordenar widget"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            {Icon && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/10">
                <Icon className="h-4 w-4 text-gold" />
              </div>
            )}
            <h3 className="card-title truncate">{title}</h3>
          </div>
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={cn('flex-1', !noPadding && 'p-6')}>{children}</div>
    </section>
  )
}

export function WidgetGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('cascade-stagger widget-grid-spaced grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3', className)}>
      {children}
    </div>
  )
}
