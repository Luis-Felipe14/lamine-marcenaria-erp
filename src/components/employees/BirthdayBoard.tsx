import { Link } from 'react-router-dom'
import { Cake, Gift, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { fetchEmployeeBirthdays, type EmployeeBirthdayInfo } from '@/services/employees.service'
import { formatBirthdayDay } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BirthdayBoardProps {
  compact?: boolean
  className?: string
}

function BirthdayItem({ person, highlight }: { person: EmployeeBirthdayInfo; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        highlight
          ? 'border-gold/30 bg-gold/10'
          : 'border-border/60 bg-surface-elevated hover:border-gold/20'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          highlight ? 'bg-gold/20 text-gold' : 'bg-surface-card text-gray-400'
        )}
      >
        {person.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white light:text-gray-900">{person.name}</p>
        <p className="truncate text-xs text-gray-500">
          {person.position}
          {person.department_label ? ` · ${person.department_label}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-gold">{formatBirthdayDay(person.birth_date)}</p>
        <p className="text-[10px] text-gray-500">
          {person.isToday ? `${person.turningAge} anos` : person.daysUntil === 1 ? 'Amanhã' : `Em ${person.daysUntil} dias`}
        </p>
      </div>
    </div>
  )
}

export function BirthdayBoard({ compact = false, className }: BirthdayBoardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['employees', 'birthdays'],
    queryFn: fetchEmployeeBirthdays,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <Card className={cn('glass-card border-gold/10', className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const total = data.today.length + data.thisMonth.length + data.upcoming.length
  if (total === 0) {
    if (compact) return null
    return (
      <Card className={cn('glass-card border-gold/10', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cake className="h-4 w-4 text-gold" />
            Aniversariantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Nenhum aniversário cadastrado. Informe a data de nascimento nos colaboradores.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    const preview = [...data.today, ...data.thisMonth, ...data.upcoming].slice(0, 4)
    return (
      <Card className={cn('glass-card border-gold/15', className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
              <Cake className="h-4 w-4 text-gold" />
            </div>
            Aniversariantes
            {data.today.length > 0 && (
              <Badge variant="success" className="ml-1">
                {data.today.length} hoje
              </Badge>
            )}
          </CardTitle>
          <Link
            to="/funcionarios"
            className="flex items-center gap-1 text-xs text-gold transition-opacity hover:opacity-80"
          >
            Ver todos <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {preview.map((person) => (
            <BirthdayItem key={person.id} person={person} highlight={person.isToday} />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('glass-card border-gold/15', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
            <Gift className="h-4 w-4 text-gold" />
          </div>
          Quadro de Aniversariantes
        </CardTitle>
        <p className="text-xs text-gray-500">Celebrando a equipe Laminê — mês atual e próximos 30 dias</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.today.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold">
              <Cake className="h-3.5 w-3.5" /> Hoje
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.today.map((person) => (
                <BirthdayItem key={person.id} person={person} highlight />
              ))}
            </div>
          </section>
        )}

        {data.thisMonth.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Este mês
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.thisMonth.map((person) => (
                <BirthdayItem key={person.id} person={person} />
              ))}
            </div>
          </section>
        )}

        {data.upcoming.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Próximos 30 dias
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.upcoming.map((person) => (
                <BirthdayItem key={person.id} person={person} />
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
