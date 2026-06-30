import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Container padrão — ritmo vertical: cabeçalho → KPIs → filtros → dados */
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('page-content animate-fade-in', className)}>{children}</div>
}

export function PageZoneLabel({ children }: { children: ReactNode }) {
  return <h2 className="page-zone-label">{children}</h2>
}

/** Indicadores resumidos no topo da página */
export function PageKpiZone({ children, className, label = 'Visão geral' }: {
  children: ReactNode
  className?: string
  label?: string
}) {
  return (
    <section className={cn('page-zone page-zone-kpi', className)} aria-label={label}>
      <PageZoneLabel>{label}</PageZoneLabel>
      {children}
    </section>
  )
}

/** Listagens, tabelas e kanbans */
export function PageDataZone({ children, className, label = 'Registros' }: {
  children: ReactNode
  className?: string
  label?: string
}) {
  return (
    <section className={cn('page-zone page-zone-data min-w-0', className)} aria-label={label}>
      {children}
    </section>
  )
}

/** Seções lado a lado (resumos, rankings, gráficos) */
export function PageSplitZone({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('page-split', className)}>{children}</div>
}

/** Bloco do dashboard com título de seção */
export function DashboardZone({ children, className, label }: {
  children: ReactNode
  className?: string
  label: string
}) {
  return (
    <section className={cn('dashboard-zone', className)} aria-label={label}>
      <PageZoneLabel>{label}</PageZoneLabel>
      {children}
    </section>
  )
}
