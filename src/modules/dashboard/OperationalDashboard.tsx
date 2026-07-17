import { Factory, Package, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DashboardZone, PageSplitZone } from '@/components/shared/PageLayout'
import { StatCard, StatCardSkeleton, StatGrid } from '@/components/shared/StatCard'
import { Widget } from '@/components/shared/Widget'
import { useOperationalMetrics } from '@/hooks/useQueries'
import { formatCurrency } from '@/lib/utils'
import { formatCurrencyMasked, hasModuleAccess } from '@/lib/secretary-access'
import { useAuthStore } from '@/stores/authStore'
import { useSecretaryAccess } from '@/hooks/useSecretaryAccess'

export function OperationalDashboard() {
  const { data, isLoading } = useOperationalMetrics()
  const role = useAuthStore((s) => s.profile?.role?.name)
  const { settings, canViewAmounts } = useSecretaryAccess()
  const canSeeLumberCredit = hasModuleAccess(role, 'lumber_credit.read', settings)
  const money = (value: number) => formatCurrencyMasked(value, canViewAmounts, formatCurrency)

  return (
    <div className="space-y-4 md:space-y-6">
      <DashboardZone label="Produção e entregas">
        <StatGrid strip>
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} compact />)
          ) : (
            <>
              <StatCard compact title="OPs Abertas" value={data.openOrders} icon={Factory} subtitle="Ordens ativas" />
              <StatCard compact title="Em Andamento" value={data.inProgress} icon={Package} highlight={data.inProgress > 0} subtitle="Na fábrica" />
              <StatCard compact title="Atrasadas" value={data.late} icon={AlertTriangle} highlight={data.late > 0} subtitle="Fora do prazo" />
              <StatCard compact title="Entregas Pendentes" value={data.pendingDeliveries} icon={CheckCircle} subtitle="Aguardando cliente" />
            </>
          )}
        </StatGrid>
      </DashboardZone>

      <DashboardZone label="Recursos">
        <PageSplitZone className={canSeeLumberCredit ? undefined : 'grid-cols-1'}>
          {canSeeLumberCredit && (
            isLoading || !data ? (
              <StatCardSkeleton compact />
            ) : (
              <Link to="/credito-madereira" className="block transition-opacity hover:opacity-90">
                <StatCard
                  compact
                  title="Créd. Madereira"
                  value={money(data.lumberCreditBalance)}
                  icon={CreditCard}
                  highlight={data.lumberCreditBalance > 0}
                  subtitle="Saldo disponível na madereira"
                />
              </Link>
            )
          )}
          <Widget title="Resumo operacional" subtitle="Indicadores consolidados">
            {isLoading || !data ? (
              <div className="space-y-2">
                {Array.from({ length: canSeeLumberCredit ? 3 : 2 }).map((_, i) => (
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
                {canSeeLumberCredit && (
                  <div className="summary-list-row">
                    <span className="text-sm text-gray-500">Crédito madereira</span>
                    <span className="font-semibold tabular-nums text-gold">{money(data.lumberCreditBalance)}</span>
                  </div>
                )}
              </div>
            )}
          </Widget>
        </PageSplitZone>
      </DashboardZone>
    </div>
  )
}
