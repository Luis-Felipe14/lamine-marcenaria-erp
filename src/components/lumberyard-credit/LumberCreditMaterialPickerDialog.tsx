import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Package, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MATERIAL_CATEGORIES } from '@/lib/constants'
import { useMaterialCategories } from '@/hooks/useMaterialCategories'
import { formatCurrency } from '@/lib/utils'
import { fetchMaterialsForLumberCredit, type LumberCreditMaterialOption } from '@/services/lookups.service'

interface LumberCreditMaterialPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onConfirm: (materials: LumberCreditMaterialOption[]) => void
}

function categoryLabel(value: string, categories: { value: string; label: string }[]) {
  return categories.find((c) => c.value === value)?.label
    ?? MATERIAL_CATEGORIES.find((c) => c.value === value)?.label
    ?? value
}

export function LumberCreditMaterialPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
}: LumberCreditMaterialPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const debouncedSearch = useDebouncedValue(search, 300)
  const { categories: materialCategories } = useMaterialCategories()
  const categoryOptions = materialCategories.map((c) => ({ value: c.value, label: c.label }))

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials', 'lumber-credit-picker'],
    queryFn: fetchMaterialsForLumberCredit,
    enabled: open,
    staleTime: 60_000,
  })

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) => {
      const category = categoryLabel(m.category, categoryOptions).toLowerCase()
      return (
        m.name.toLowerCase().includes(q)
        || category.includes(q)
        || (m.code?.toLowerCase().includes(q) ?? false)
        || (m.brand?.toLowerCase().includes(q) ?? false)
        || (m.specification?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [materials, debouncedSearch, categoryOptions])

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setPendingIds(selectedIds)
      setSearch('')
    }
    onOpenChange(next)
  }

  const toggleMaterial = (id: string) => {
    setPendingIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ))
  }

  const handleConfirm = () => {
    const selected = materials.filter((m) => pendingIds.includes(m.id))
    onConfirm(selected)
    onOpenChange(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[80] max-w-2xl gap-3">
        <DialogHeader>
          <DialogTitle>Selecionar materiais</DialogTitle>
          <DialogDescription>
            Escolha um ou mais materiais cadastrados. Marca e especificações ajudam na identificação.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, marca, especificação, código..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[min(52vh,420px)] overflow-y-auto rounded-lg border border-border">
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
              {filtered.map((material) => {
                const selected = pendingIds.includes(material.id)
                return (
                  <li key={material.id}>
                    <button
                      type="button"
                      onClick={() => toggleMaterial(material.id)}
                      className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors ${
                        selected ? 'bg-gold/12 hover:bg-gold/16' : 'hover:bg-gold/8'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          selected ? 'border-gold bg-gold text-black' : 'border-white/20 bg-transparent'
                        }`}
                        aria-hidden
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white light:text-gray-900">{material.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {categoryLabel(material.category, categoryOptions)}
                          {material.brand ? ` · Marca: ${material.brand}` : ''}
                        </p>
                        {material.specification ? (
                          <p className="mt-1 text-xs text-gray-400">
                            Especificações: {material.specification}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-gray-500">
                          {material.code ? `Cód. ${material.code} · ` : ''}
                          Estoque: {material.current_stock} {material.unit}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-gold">
                        {formatCurrency(material.unit_cost)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            {pendingIds.length} material(is) selecionado(s)
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={pendingIds.length === 0}>
              Adicionar selecionados
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
