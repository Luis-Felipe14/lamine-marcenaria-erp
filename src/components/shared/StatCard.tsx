import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  className?: string
  compact?: boolean
  highlight?: boolean
  hero?: boolean
}

export function StatGrid({
  children,
  className,
  strip,
}: {
  children: ReactNode
  className?: string
  /** Fileira horizontal de KPIs (estilo cockpit) */
  strip?: boolean
}) {
  return (
    <div
      className={cn(
        'cascade-stagger grid gap-4 lg:gap-5',
        strip
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 stat-grid-mobile-tight'
          : 'grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className, compact, highlight, hero }: StatCardProps) {
  const iconBox = (
    <div className={cn(
      'shrink-0 rounded-lg bg-gold/10 transition-all duration-200 group-hover:bg-gold/15 group-hover:scale-105',
      compact ? 'p-1.5' : 'p-2'
    )}>
      <Icon className={cn('text-gold', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
    </div>
  )

  return (
    <div
      className={cn(
        'premium-card hover-lift group relative min-w-0 overflow-hidden',
        highlight && 'border-gold/25',
        hero && 'border-gold/20 bg-gradient-to-br from-surface-card to-surface-elevated',
        className
      )}
    >
      {hero && (
        <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gold/5 blur-2xl" />
      )}
      <div className={cn(compact ? 'p-4' : 'p-6', 'relative flex h-full flex-col')}>
        {compact ? (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-2">
            <p className="card-label col-start-1 row-start-1 line-clamp-2">
              {title}
            </p>
            <div className="col-start-2 row-start-1 self-start">{iconBox}</div>
            <p className="card-value col-span-2 row-start-2 tabular-nums">
              {value}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
              <p className="card-label line-clamp-2">
                {title}
              </p>
              {iconBox}
            </div>
            <p className={cn(
              'card-value mt-auto tabular-nums',
              hero && 'card-value-hero'
            )}>
              {value}
            </p>
          </>
        )}

        {!compact && subtitle && (
          <p className="mt-1 text-[10px] text-gray-500">{subtitle}</p>
        )}
        {!compact && trend && (
          <p className={cn('mt-1.5 text-xs font-medium', trend.positive ? 'text-green-400' : 'text-red-400')}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs mês anterior
          </p>
        )}
      </div>
    </div>
  )
}

export function StatCardSkeleton({ compact, hero }: { compact?: boolean; hero?: boolean }) {
  return (
    <div className={cn('premium-card min-w-0 overflow-hidden', hero && 'border-gold/20')}>
      <div className={cn(compact ? 'p-4' : 'p-6', 'space-y-3')}>
        <Skeleton className={cn('h-3 w-2/3', compact && 'h-2.5')} />
        <Skeleton className={cn('h-8 w-1/2', hero && 'h-10 w-3/5')} />
        {!compact && <Skeleton className="h-2.5 w-1/3" />}
      </div>
    </div>
  )
}
