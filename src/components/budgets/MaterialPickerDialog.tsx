import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MATERIAL_CATEGORIES } from '@/lib/constants'
import { useMaterialCategories } from '@/hooks/useMaterialCategories'
import { formatCurrency } from '@/lib/utils'
import { fetchMaterialsForBudget, type BudgetMaterialOption } from '@/services/lookups.service'

interface MaterialPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (material: BudgetMaterialOption) => void
}

function categoryLabel(value: string, categories: { value: string; label: string }[]) {
  return categories.find((c) => c.value === value)?.label
    ?? MATERIAL_CATEGORIES.find((c) => c.value === value)?.label
    ?? value
}

export function MaterialPickerDialog({ open, onOpenChange, onSelect }: MaterialPickerDialogProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { categories: materialCategories } = useMaterialCategories()
  const categoryOptions = materialCategories.map((c) => ({ value: c.value, label: c.label }))

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials', 'budget-picker'],
    queryFn: fetchMaterialsForBudget,
    enabled: open,
    staleTime: 60_000,
  })

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) => {
      const category = categoryLabel(m.category, categoryOptions).toLowerCase()
      return (
        m.name.toLowerCase().includes(q) ||
        category.includes(q) ||
        (m.code?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [materials, debouncedSearch, categoryOptions])

  const handleSelect = (material: BudgetMaterialOption) => {
    onSelect(material)
    onOpenChange(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[80] max-w-lg gap-3 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Selecionar material do estoque</DialogTitle>
          <DialogDescription>
            Escolha um material cadastrado. O preço unitário será preenchido automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou categoria..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[min(50vh,360px)] overflow-y-auto rounded-lg border border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Carregando materiais...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Package className="h-8 w-8 opacity-40" />
              <p>{materials.length === 0 ? 'Nenhum material cadastrado no estoque.' : 'Nenhum material encontrado.'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((material) => (
                <li key={material.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(material)}
                    className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-gold/8"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white light:text-gray-900">{material.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {categoryLabel(material.category, categoryOptions)}
                        {material.code ? ` · Cód. ${material.code}` : ''}
                        {` · Estoque: ${material.current_stock} ${material.unit}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gold">
                      {formatCurrency(material.unit_cost)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
