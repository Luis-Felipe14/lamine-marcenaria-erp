import { Link } from 'react-router-dom'
import { Factory, Package, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react'
import { DashboardZone, PageSplitZone } from '@/components/shared/PageLayout'
import { StatCard, StatCardSkeleton, StatGrid } from '@/components/shared/StatCard'
import { Widget } from '@/components/shared/Widget'
import { formatCurrency } from '@/lib/utils'
import { useOperationalMetrics } from '@/hooks/useQueries'

export function OperationalDashboard() {
  const { data, isLoading } = useOperationalMetrics()

  return (
    <div className="space-y-6">
      <DashboardZone label="Produção e entregas">
        <StatGrid strip>
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="OPs Abertas" value={data.openOrders} icon={Factory} subtitle="Ordens ativas" />
              <StatCard title="Em Andamento" value={data.inProgress} icon={Package} highlight={data.inProgress > 0} subtitle="Na fábrica" />
              <StatCard title="Atrasadas" value={data.late} icon={AlertTriangle} highlight={data.late > 0} subtitle="Fora do prazo" />
              <StatCard title="Entregas Pendentes" value={data.pendingDeliveries} icon={CheckCircle} subtitle="Aguardando cliente" />
            </>
          )}
        </StatGrid>
      </DashboardZone>

      <DashboardZone label="Recursos">
        <PageSplitZone>
          {isLoading || !data ? (
            <StatCardSkeleton />
          ) : (
            <Link to="/credito-madereira" className="block transition-opacity hover:opacity-90">
              <StatCard
                title="Créd. Madereira"
                value={formatCurrency(data.lumberCreditBalance)}
                icon={CreditCard}
                highlight={data.lumberCreditBalance > 0}
                subtitle="Saldo disponível na madereira"
              />
            </Link>
          )}
          <Widget title="Resumo operacional" subtitle="Indicadores consolidados">
            {isLoading || !data ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="summary-list-row animate-pulse">
                    <span className="h-3 w-1/3 rounded bg-surface-elevated" />
                    <span className="h-3 w-12 rounded bg-surface-elevated" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="summary-list-row">
                  <span className="text-sm text-gray-500">OPs em andamento</span>
                  <span className="font-semibold tabular-nums text-gold">{data.inProgress}</span>
                </div>
                <div className="summary-list-row">
                  <span className="text-sm text-gray-500">Pedidos atrasados</span>
                  <span className={data.late > 0 ? 'font-semibold tabular-nums text-red-400' : 'font-semibold tabular-nums'}>{data.late}</span>
                </div>
                <div className="summary-list-row">
                  <span className="text-sm text-gray-500">Crédito madereira</span>
                  <span className="font-semibold tabular-nums text-gold">{formatCurrency(data.lumberCreditBalance)}</span>
                </div>
              </div>
            )}
          </Widget>
        </PageSplitZone>
      </DashboardZone>
    </div>
  )
}
