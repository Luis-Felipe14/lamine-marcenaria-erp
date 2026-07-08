import { Target, FileText, CheckCircle, TrendingUp, DollarSign, Users, PenTool } from 'lucide-react'
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
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Widget key={i} title="Carregando..." icon={Users}>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((__, j) => <Skeleton key={j} className="h-12 rounded-xl" />)}
                </div>
              </Widget>
            ))}
          </div>
        ) : data ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.sellerRanking.length > 0 ? (
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

            {data.architectRanking.length > 0 ? (
              <Widget title="Ranking de Arquitetos" subtitle="Por valor vendido" icon={PenTool}>
                <div className="space-y-2">
                  {data.architectRanking.map((row, i) => (
                    <div key={row.architect_id} className="summary-list-row">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-xs font-bold text-gold">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name}</p>
                          <p className="text-xs text-gray-500">{row.projectCount} projeto(s)</p>
                        </div>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-gold">{formatCurrency(row.soldValue)}</span>
                    </div>
                  ))}
                </div>
              </Widget>
            ) : (
              <Widget title="Ranking de Arquitetos" icon={PenTool}>
                <p className="text-sm text-gray-500">Nenhum projeto vinculado a arquitetos ainda.</p>
              </Widget>
            )}

            {data.architectRanking.length > 0 ? (
              <Widget title="Projetos por Arquiteto" subtitle="Quantidade de orçamentos ganhos" icon={PenTool} className="lg:col-span-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {[...data.architectRanking]
                    .sort((a, b) => b.projectCount - a.projectCount)
                    .map((row, i) => (
                      <div key={`count-${row.architect_id}`} className="summary-list-row">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-xs font-bold text-gold">{i + 1}</span>
                          <span className="truncate font-medium">{row.name}</span>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums text-gold">{row.projectCount}</span>
                      </div>
                    ))}
                </div>
              </Widget>
            ) : null}
          </div>
        ) : null}
      </DashboardZone>
    </div>
  )
}
