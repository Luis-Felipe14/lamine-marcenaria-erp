import { Target, FileText, CheckCircle, TrendingUp, DollarSign, Users } from 'lucide-react'
import { DashboardZone } from '@/components/shared/PageLayout'
import { StatCard, StatCardSkeleton, StatGrid } from '@/components/shared/StatCard'
import { Widget } from '@/components/shared/Widget'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useCommercialMetrics } from '@/hooks/useQueries'

export function CommercialDashboard() {
  const { data, isLoading } = useCommercialMetrics()

  return (
    <div className="space-y-6">
      <DashboardZone label="Indicadores do período">
        <StatGrid strip>
          {isLoading || !data ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Leads Recebidos" value={data.leadsReceived} icon={Target} subtitle="Entrada no funil" />
              <StatCard title="Orçamentos Enviados" value={data.budgetsSent} icon={FileText} subtitle="Propostas ativas" />
              <StatCard title="Aprovados" value={data.budgetsApproved} icon={CheckCircle} subtitle="Convertidos" />
              <StatCard title="Taxa de Conversão" value={`${data.conversionRate.toFixed(1)}%`} icon={TrendingUp} subtitle="Aprovados / enviados" />
              <StatCard title="Valor Vendido" value={formatCurrency(data.soldValue)} icon={DollarSign} highlight subtitle="Total aprovado" />
            </>
          )}
        </StatGrid>
      </DashboardZone>

      <DashboardZone label="Desempenho comercial">
        {isLoading ? (
          <Widget title="Ranking de Vendedores" icon={Users}>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          </Widget>
        ) : data && data.sellerRanking.length > 0 ? (
          <Widget title="Ranking de Vendedores" subtitle="Por valor vendido no período" icon={Users}>
            <div className="space-y-2">
              {data.sellerRanking.map((s, i) => (
                <div key={i} className="summary-list-row">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-xs font-bold text-gold">{i + 1}</span>
                    <span className="truncate font-medium">{s.name}</span>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-gold">{formatCurrency(s.total)}</span>
                </div>
              ))}
            </div>
          </Widget>
        ) : (
          <Widget title="Ranking de Vendedores" icon={Users}>
            <p className="text-sm text-gray-500">Nenhuma venda registrada no período.</p>
          </Widget>
        )}
      </DashboardZone>
    </div>
  )
}
