import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Users, Target, FileText, CheckCircle, Factory, AlertTriangle,
  Package, TrendingUp, Wallet, Activity, Sun, Megaphone,
} from 'lucide-react'
import { StatCard, StatCardSkeleton } from '@/components/shared/StatCard'
import { Widget, WidgetGrid } from '@/components/shared/Widget'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { useExecutiveMetrics, useFinancialChart } from '@/hooks/useQueries'
import { useIntersectionVisible } from '@/hooks/useIntersectionVisible'
import { useUIStore, type WidgetId } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { BirthdayBoard } from '@/components/employees/BirthdayBoard'
import { DashboardZone } from '@/components/shared/PageLayout'
import type { UserRole } from '@/types'

const FinancialChartWidget = lazy(() =>
  import('@/modules/dashboard/FinancialChartWidget').then((m) => ({ default: m.FinancialChartWidget }))
)

export function ExecutiveDashboard() {
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useExecutiveMetrics()
  const { ref: chartRef, visible: chartVisible } = useIntersectionVisible('200px')
  const { data: chart = [], isLoading: chartLoading } = useFinancialChart(6, chartVisible)

  useEffect(() => {
    if (metricsError) toast.error('Erro ao carregar métricas do dashboard')
  }, [metricsError])
  const widgetOrder = useUIStore((s) => s.dashboardWidgetOrder)
  const moveWidget = useUIStore((s) => s.moveWidget)
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const canSeeBirthdays = hasPermission(role, 'employees.read')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDrop = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      moveWidget(dragIndex, overIndex)
    }
    setDragIndex(null)
    setOverIndex(null)
  }, [dragIndex, overIndex, moveWidget])

  const alerts = useMemo(
    () =>
      metrics
        ? ([
            metrics.ordersLate > 0 && { type: 'danger' as const, text: `${metrics.ordersLate} pedido(s) atrasado(s)` },
            metrics.criticalStock > 0 && { type: 'warning' as const, text: `${metrics.criticalStock} item(ns) com estoque crítico` },
          ].filter(Boolean) as { type: 'danger' | 'warning'; text: string }[])
        : [],
    [metrics]
  )

  const widgets: Record<WidgetId, ReactNode> = useMemo(() => ({
    'hero-kpis': (
      <div key="hero-kpis" className="col-span-full space-y-3">
        <div className={cn(
          'cascade-stagger grid gap-4 sm:grid-cols-2',
          metrics?.goalEnabled ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
        )}>
          {metricsLoading || !metrics ? (
            Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} hero />
            ))
          ) : (
            <>
              <StatCard hero title="Receita do Dia" value={formatCurrency(metrics.dailyRevenue)} icon={Sun} subtitle="Pagamentos recebidos hoje" />
              <StatCard hero title="Receita do Mês" value={formatCurrency(metrics.revenue)} icon={TrendingUp} highlight />
              {metrics.goalEnabled && (
                <StatCard
                  hero
                  title="Meta Mensal"
                  value={formatPercent(metrics.goalProgress)}
                  icon={Target}
                  subtitle={formatCurrency(metrics.monthlyGoal)}
                  highlight={metrics.goalProgress >= 100}
                />
              )}
              <StatCard hero title="Saldo" value={formatCurrency(metrics.balance)} icon={Wallet} highlight={metrics.balance >= 0} />
            </>
          )}
        </div>
        {metrics?.goalEnabled && !metricsLoading && (
          <div className="premium-card px-5 py-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-gray-500">Progresso da meta mensal</span>
              <span className="font-semibold text-gold">{formatCurrency(metrics.revenue)} / {formatCurrency(metrics.monthlyGoal)}</span>
            </div>
            <div className="goal-progress">
              <div className="goal-progress-bar" style={{ width: `${Math.min(metrics.goalProgress, 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    ),
    'chart-row': (
      <div key="chart-row" className="col-span-full grid gap-5 xl:grid-cols-3">
        <Widget title="Evolução do Faturamento" subtitle="Receitas vs despesas — 6 meses" icon={Activity} span="wide" className="xl:col-span-2" noPadding>
          <div ref={chartRef} className="px-2 pb-4 pt-2 min-h-[280px]">
            {!chartVisible || chartLoading ? (
              <Skeleton className="mx-2 h-[280px] w-[calc(100%-1rem)] rounded-lg" />
            ) : (
              <Suspense fallback={<Skeleton className="mx-2 h-[280px] w-[calc(100%-1rem)] rounded-lg" />}>
                <FinancialChartWidget data={chart} />
              </Suspense>
            )}
          </div>
        </Widget>
        <Widget title="Fluxo Financeiro" subtitle="Resumo do período" icon={Wallet}>
          {metricsLoading || !metrics ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2.5">
                <span className="text-xs text-gray-500">Receitas</span>
                <span className="text-sm font-semibold text-green-400">{formatCurrency(metrics.revenue)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2.5">
                <span className="text-xs text-gray-500">Despesas</span>
                <span className="text-sm font-semibold text-red-400">{formatCurrency(metrics.expenses)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5">
                <span className="text-xs text-gray-400">Resultado</span>
                <span className="text-sm font-bold text-gold">{formatCurrency(metrics.balance)}</span>
              </div>
            </div>
          )}
        </Widget>
      </div>
    ),
    pipeline: (
      <Widget key="pipeline" title="Pipeline Comercial" subtitle="Funil de vendas" icon={FileText} draggable onDragStart={() => setDragIndex(widgetOrder.indexOf('pipeline'))} onDragOver={(e) => { e.preventDefault(); setOverIndex(widgetOrder.indexOf('pipeline')) }} onDrop={handleDrop} isDragging={dragIndex === widgetOrder.indexOf('pipeline')}>
        <div className="grid min-w-0 grid-cols-2 gap-2.5">
          {metricsLoading || !metrics ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} compact />)
          ) : (
            <>
              <StatCard compact title="Orçamentos" value={metrics.totalBudgets} icon={FileText} />
              <StatCard compact title="Aprovados" value={metrics.budgetsApproved} icon={CheckCircle} />
              <StatCard compact title="Clientes" value={metrics.totalClients} icon={Users} />
              <StatCard compact title="Leads" value={metrics.totalLeads} icon={Target} />
            </>
          )}
        </div>
      </Widget>
    ),
    operations: (
      <Widget key="operations" title="Produção & Operação" subtitle="Status em tempo real" icon={Factory} draggable onDragStart={() => setDragIndex(widgetOrder.indexOf('operations'))} onDragOver={(e) => { e.preventDefault(); setOverIndex(widgetOrder.indexOf('operations')) }} onDrop={handleDrop} isDragging={dragIndex === widgetOrder.indexOf('operations')}>
        <div className="grid min-w-0 grid-cols-2 gap-2.5">
          {metricsLoading || !metrics ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} compact />)
          ) : (
            <>
              <StatCard compact title="Em Produção" value={metrics.ordersInProduction} icon={Factory} highlight={metrics.ordersInProduction > 0} />
              <StatCard compact title="Atrasados" value={metrics.ordersLate} icon={AlertTriangle} highlight={metrics.ordersLate > 0} />
              <StatCard compact title="Estoque Crítico" value={metrics.criticalStock} icon={Package} highlight={metrics.criticalStock > 0} />
              <StatCard compact title="Inv. Marketing" value={formatCurrency(metrics.marketingMonth)} icon={Megaphone} subtitle="Gasto no mês" />
            </>
          )}
        </div>
      </Widget>
    ),
    alerts: (
      <Widget key="alerts" title="Alertas Inteligentes" subtitle="Atenção imediata" icon={AlertTriangle} draggable onDragStart={() => setDragIndex(widgetOrder.indexOf('alerts'))} onDragOver={(e) => { e.preventDefault(); setOverIndex(widgetOrder.indexOf('alerts')) }} onDrop={handleDrop} isDragging={dragIndex === widgetOrder.indexOf('alerts')}>
        {metricsLoading ? (
          <Skeleton className="h-12 w-full rounded-lg" />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum alerta. Operação em dia.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-surface-elevated px-3 py-2.5 text-sm">{a.text}</div>
            ))}
          </div>
        )}
      </Widget>
    ),
  }), [metrics, metricsLoading, chart, chartLoading, chartVisible, chartRef, widgetOrder, dragIndex, overIndex, handleDrop])

  const bottomWidgets = useMemo(
    () => widgetOrder.filter((id) => !['hero-kpis', 'chart-row'].includes(id)),
    [widgetOrder]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a, i) => (
            <Badge key={i} variant={a.type}>{a.text}</Badge>
          ))}
        </div>
      )}

      <DashboardZone label="Indicadores principais">
        {widgets['hero-kpis']}
      </DashboardZone>

      <DashboardZone label="Análise financeira">
        {widgets['chart-row']}
      </DashboardZone>

      {canSeeBirthdays && (
        <DashboardZone label="Equipe">
          <BirthdayBoard compact />
        </DashboardZone>
      )}

      <DashboardZone label="Painéis operacionais">
        <WidgetGrid>
          {bottomWidgets.map((id) => widgets[id])}
        </WidgetGrid>
        <p className="text-center text-[10px] text-gray-600">Arraste os widgets pelo ícone ⋮⋮ para reorganizar o cockpit</p>
      </DashboardZone>
    </div>
  )
}
