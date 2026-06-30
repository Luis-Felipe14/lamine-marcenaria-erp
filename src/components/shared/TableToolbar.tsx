import { Search, Rows3, AlignJustify } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface TableToolbarProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  className?: string
  children?: React.ReactNode
  /** Envolve filtros em painel destacado (padrão nas listagens principais) */
  panel?: boolean
  zoneLabel?: string
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Pesquisar...',
  className,
  children,
  panel = false,
  zoneLabel = 'Filtros e busca',
}: TableToolbarProps) {
  const { tableDensity, setTableDensity } = useUIStore()

  const toolbar = (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-1 items-center gap-2">
        {onSearchChange !== undefined && (
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder={searchPlaceholder}
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        )}
        {children}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-0.5">
        <Button
          type="button"
          variant={tableDensity === 'comfortable' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() => setTableDensity('comfortable')}
          aria-label="Densidade confortável"
        >
          <AlignJustify className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Confortável</span>
        </Button>
        <Button
          type="button"
          variant={tableDensity === 'compact' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() => setTableDensity('compact')}
          aria-label="Densidade compacta"
        >
          <Rows3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Compacto</span>
        </Button>
      </div>
    </div>
  )

  if (!panel) return toolbar

  return (
    <section className="page-zone page-zone-filters" aria-label={zoneLabel}>
      <h2 className="page-zone-label">{zoneLabel}</h2>
      <div className="premium-card px-4 py-3">{toolbar}</div>
    </section>
  )
}
