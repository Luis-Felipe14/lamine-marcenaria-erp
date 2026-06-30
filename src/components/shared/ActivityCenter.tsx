import { useNavigate } from 'react-router-dom'
import { Activity, Target, Package, FileText, Users, Factory } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentActivities } from '@/hooks/useQueries'
import { formatRelativeDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const typeIcons = {
  lead: Target,
  order: Package,
  budget: FileText,
  client: Users,
  production: Factory,
  financial: Activity,
}

const typeColors = {
  lead: 'text-blue-400 bg-blue-400/10',
  order: 'text-gold bg-gold/10',
  budget: 'text-purple-400 bg-purple-400/10',
  client: 'text-green-400 bg-green-400/10',
  production: 'text-orange-400 bg-orange-400/10',
  financial: 'text-emerald-400 bg-emerald-400/10',
}

interface ActivityCenterProps {
  className?: string
  limit?: number
  compact?: boolean
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityCenter({ className, limit = 8, compact = false }: ActivityCenterProps) {
  const navigate = useNavigate()
  const { data: activities = [], isLoading } = useRecentActivities(limit)

  const content = (
    <div className={cn('space-y-1', compact && 'max-h-64 overflow-y-auto')}>
      {isLoading && <ActivitySkeleton />}
      {!isLoading && activities.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">Nenhuma atividade recente</p>
      )}
      {!isLoading && activities.map((item, i) => {
        const Icon = typeIcons[item.type]
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.link)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-all hover:bg-surface-elevated',
              'animate-fade-in'
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={cn('mt-0.5 rounded-lg p-1.5', typeColors[item.type])}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white light:text-gray-900">{item.title}</p>
              <p className="truncate text-xs text-gray-500">{item.description}</p>
              <p className="mt-0.5 text-[10px] text-gray-600">{formatRelativeDate(item.created_at)}</p>
            </div>
          </button>
        )
      })}
    </div>
  )

  if (compact) return <div className={className}>{content}</div>

  return (
    <Card className={cn('border-gold/15', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10">
            <Activity className="h-3.5 w-3.5 text-gold" />
          </div>
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{content}</CardContent>
    </Card>
  )
}
