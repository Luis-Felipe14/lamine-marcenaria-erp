import { lazy, Suspense } from 'react'
import { TrendingDown, TrendingUp, Wallet, PieChart } from 'lucide-react'
import { DashboardZone } from '@/components/shared/PageLayout'
import { StatCard, StatCardSkeleton, StatGrid } from '@/components/shared/StatCard'
import { Widget } from '@/components/shared/Widget'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useFinancialDashboardMetrics } from '@/hooks/useQueries'
import { useIntersectionVisible } from '@/hooks/useIntersectionVisible'

const ExpensesBarChart = lazy(() =>
  import('@/modules/dashboard/ExpensesBarChart').then((m) => ({ default: m.ExpensesBarChart }))
)

export function FinancialDashboard() {
  const { data, isLoading } = useFinancialDashboardMetrics()
  const { ref: chartRef, visible: chartVisible } = useIntersectionVisible('120px')

  return (
    <div className="space-y-6">
      <DashboardZone label="Resumo financeiro">
        <StatGrid strip>
          {isLoading || !data ? (
            Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Contas a Pagar" value={formatCurrency(data.accountsPayable)} icon={TrendingDown} subtitle="Pendências de saída" />
              <StatCard title="Contas a Receber" value={formatCurrency(data.accountsReceivable)} icon={TrendingUp} highlight subtitle="Entradas previstas" />
              <StatCard title="Resultado Mensal" value={formatCurrency(data.monthlyResult)} icon={Wallet} highlight={data.monthlyResult >= 0} subtitle="Receitas − despesas" />
            </>
          )}
        </StatGrid>
      </DashboardZone>

      {(isLoading || (data && data.expensesByCategory.length > 0)) && (
        <DashboardZone label="Análise de despesas">
          <Widget title="Despesas por Categoria" subtitle="Distribuição no período" icon={PieChart} noPadding>
            <div ref={chartRef} className="px-4 pb-4 pt-2 min-h-[260px]">
              {isLoading || !chartVisible ? (
                <Skeleton className="h-[260px] w-full rounded-lg" />
              ) : data && data.expensesByCategory.length > 0 ? (
                <Suspense fallback={<Skeleton className="h-[260px] w-full rounded-lg" />}>
                  <ExpensesBarChart data={data.expensesByCategory} />
                </Suspense>
              ) : null}
            </div>
          </Widget>
        </DashboardZone>
      )}
    </div>
  )
}
