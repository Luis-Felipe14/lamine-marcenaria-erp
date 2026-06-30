import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  emptyMessage?: string
  onRowClick?: (row: T) => void
  clientFilter?: string
  filterKeys?: string[]
  virtualize?: boolean
}

type SortDir = 'asc' | 'desc'

const VIRTUAL_THRESHOLD = 35
const ROW_HEIGHT_DEFAULT = 48
const ROW_HEIGHT_COMPACT = 40

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  page = 1,
  totalPages = 1,
  onPageChange,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  clientFilter,
  filterKeys,
  virtualize,
}: DataTableProps<T>) {
  const tableDensity = useUIStore((s) => s.tableDensity)
  const compact = tableDensity === 'compact'
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    let rows = [...data]
    const q = clientFilter?.trim().toLowerCase()
    if (q && filterKeys?.length) {
      rows = rows.filter((row) =>
        filterKeys.some((key) => {
          const val = (row as Record<string, unknown>)[key]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[sortKey] ?? '')
        const bv = String((b as Record<string, unknown>)[sortKey] ?? '')
        const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true, sensitivity: 'base' })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, clientFilter, filterKeys, sortKey, sortDir])

  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_DEFAULT
  const useVirtual = (virtualize ?? filtered.length >= VIRTUAL_THRESHOLD) && filtered.length > 0

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function renderRow(row: T) {
    return (
      <tr
        key={row.id}
        className={cn(onRowClick && 'cursor-pointer')}
        onClick={() => onRowClick?.(row)}
      >
        {columns.map((col) => (
          <td key={col.key} className={col.className}>
            {col.render
              ? col.render(row)
              : String((row as Record<string, unknown>)[col.key] ?? '-')}
          </td>
        ))}
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="premium-card overflow-hidden p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="premium-card flex h-48 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-gray-400">{emptyMessage}</p>
        <p className="text-xs text-gray-600">Nenhum dado para exibir no momento</p>
      </div>
    )
  }

  return (
    <div className="premium-card overflow-hidden">
      <div ref={scrollRef} className="max-h-[min(70vh,640px)] overflow-auto">
        <table className={cn('premium-table w-full', compact && 'premium-table-compact')}>
          <thead className="sticky top-0 z-10 bg-surface-card">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.sortable !== false && col.key !== 'actions' ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-gray-200 light:hover:text-gray-800"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-gold" /> : <ArrowDown className="h-3 w-3 text-gold" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-gray-500">
                  Nenhum resultado para o filtro aplicado
                </td>
              </tr>
            ) : useVirtual ? (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => renderRow(filtered[virtualRow.index]))}
                {paddingBottom > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                  </tr>
                )}
              </>
            ) : (
              filtered.map((row) => renderRow(row))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-border/60 bg-surface-card px-4 py-3">
          <span className="text-xs text-gray-500 tabular-nums">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
