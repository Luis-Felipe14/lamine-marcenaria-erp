import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowDown, ArrowUp, Pencil, Trash2, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent } from '@/components/shared/PageLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  CONSUMPTION_UNITS,
  MATERIAL_UNITS,
  SELECT_NONE,
  getMaterialUsageTypeLabel,
} from '@/lib/constants'
import { useDepartments } from '@/hooks/useDepartments'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useMaterialCategories } from '@/hooks/useMaterialCategories'
import { useLookupSuppliers, useLowStockMaterials, useMaterials } from '@/hooks/useQueries'
import { invalidateInventoryQueries } from '@/lib/invalidate-inventory'
import { emptyToNull } from '@/lib/supabase-helpers'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import { uploadMaterialImage, validateMaterialImage } from '@/services/materials.service'
import type { InventoryMaterial } from '@/services/inventory-list.service'
import { StockAlertsPanel } from '@/components/inventory/StockAlertsPanel'
import { useAuthStore } from '@/stores/authStore'
import { useConfirm } from '@/hooks/useConfirm'
import type { MaterialUsageType } from '@/types'

type Material = InventoryMaterial

interface MaterialSupplier {
  id: string
  name: string
}

interface MatFormState {
  name: string
  code: string
  category: string
  unit: string
  specification: string
  brand: string
  supplier_id: string
  location: string
  min_stock: number
  max_stock: number | ''
  unit_cost: number
  notes: string
  is_active: boolean
}

const emptyMatForm = (usageType: MaterialUsageType = 'materia_prima'): MatFormState => ({
  name: '',
  code: '',
  category: usageType === 'consumo' ? 'escritorio' : 'mdf',
  unit: 'un',
  specification: '',
  brand: '',
  supplier_id: '',
  location: '',
  min_stock: 0,
  max_stock: '',
  unit_cost: 0,
  notes: '',
  is_active: true,
})

function resolveSupplier(supplier: Material['supplier']): MaterialSupplier | null {
  if (!supplier) return null
  return Array.isArray(supplier) ? supplier[0] ?? null : supplier
}

function materialToForm(material: Material): MatFormState {
  return {
    name: material.name,
    code: material.code ?? '',
    category: material.category,
    unit: material.unit,
    specification: material.specification ?? '',
    brand: material.brand ?? '',
    supplier_id: material.supplier_id ?? '',
    location: material.location ?? '',
    min_stock: material.min_stock,
    max_stock: material.max_stock ?? '',
    unit_cost: material.unit_cost,
    notes: material.notes ?? '',
    is_active: material.is_active ?? true,
  }
}

function formToPayload(form: MatFormState, usageType: MaterialUsageType) {
  if (usageType === 'consumo') {
    return emptyToNull({
      name: form.name.trim(),
      category: form.category,
      usage_type: 'consumo',
      unit: form.unit,
      location: form.location.trim() || null,
      min_stock: form.min_stock,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      code: null,
      specification: null,
      brand: null,
      supplier_id: null,
      max_stock: null,
      unit_cost: 0,
      image_url: null,
    })
  }

  return emptyToNull({
    name: form.name.trim(),
    code: form.code.trim() || null,
    category: form.category,
    usage_type: usageType,
    unit: form.unit,
    specification: form.specification.trim() || null,
    brand: form.brand.trim() || null,
    supplier_id: form.supplier_id || null,
    location: form.location.trim() || null,
    min_stock: form.min_stock,
    max_stock: form.max_stock === '' ? null : Number(form.max_stock),
    unit_cost: form.unit_cost,
    notes: form.notes.trim() || null,
    is_active: form.is_active,
  })
}

function stockStatus(material: Material): 'critical' | 'over' | 'inactive' | 'ok' {
  if (!material.is_active) return 'inactive'
  if (material.current_stock <= material.min_stock) return 'critical'
  if (material.max_stock != null && material.max_stock > 0 && material.current_stock > material.max_stock) return 'over'
  return 'ok'
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const returnAfterCreateRef = useRef<string | null>(null)
  const { materiaPrimaCategories, consumoCategories, getLabel: getCategoryLabel } = useMaterialCategories()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<MaterialUsageType>('materia_prima')
  const [page, setPage] = useState(1)
  const [matDialog, setMatDialog] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [dialogUsageType, setDialogUsageType] = useState<MaterialUsageType>('materia_prima')
  const [movDialog, setMovDialog] = useState<string | null>(null)
  const [matForm, setMatForm] = useState(emptyMatForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [movForm, setMovForm] = useState({ movement_type: 'entrada', quantity: 0, department_id: '', notes: '' })
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 400)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const userId = useAuthStore((s) => s.user?.id)
  const departments = useDepartments()
  const { data: suppliers = [] } = useLookupSuppliers()
  const { data: lowStockItems = [], isLoading: lowStockLoading } = useLowStockMaterials()

  const materialsFilters = useMemo(
    () => ({
      usageType: activeTab,
      category: categoryFilter,
      activeFilter,
      search: debouncedSearch,
      page,
    }),
    [activeTab, categoryFilter, activeFilter, debouncedSearch, page]
  )

  const { data: materialsResult, isLoading: loading } = useMaterials(materialsFilters)
  const materials = materialsResult?.data ?? []
  const totalPages = materialsResult?.totalPages ?? 1

  const refreshInventory = useCallback(() => {
    void invalidateInventoryQueries(queryClient)
  }, [queryClient])

  const clearImageState = useCallback(() => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [imagePreview])

  const closeMaterialDialog = useCallback(() => {
    setMatDialog(false)
    setEditing(null)
    setMatForm(emptyMatForm(activeTab))
    clearImageState()
  }, [activeTab, clearImageState])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter, activeFilter, activeTab])

  const openCreate = (usageType: MaterialUsageType) => {
    setEditing(null)
    setDialogUsageType(usageType)
    setMatForm(emptyMatForm(usageType))
    clearImageState()
    setMatDialog(true)
  }

  useEffect(() => {
    const cadastrar = searchParams.get('cadastrar')
    const retorno = searchParams.get('retorno')
    if (cadastrar !== 'materia_prima' && cadastrar !== 'consumo') return

    setActiveTab(cadastrar)
    if (retorno === 'compras') returnAfterCreateRef.current = '/compras'
    openCreate(cadastrar)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const openEdit = (material: Material) => {
    setEditing(material)
    setDialogUsageType(material.usage_type)
    setMatForm(materialToForm(material))
    clearImageState()
    if (material.usage_type === 'materia_prima') {
      setImagePreview(material.image_url)
    }
    setMatDialog(true)
  }

  const handleImageSelect = (file: File | undefined) => {
    if (!file) return
    try {
      validateMaterialImage(file)
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setRemoveImage(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao selecionar imagem')
    }
  }

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const saveMaterial = async () => {
    if (!matForm.name.trim()) {
      toast.error('Informe o nome do material')
      return
    }

    const usageType = editing?.usage_type ?? dialogUsageType
    const basePayload = formToPayload(matForm, usageType)

    setSubmitting(true)
    try {
      let materialId = editing?.id
      let imageUrl = editing?.image_url ?? null

      if (!materialId) {
        const created = await createRecord<Material>('materials', { ...basePayload, image_url: null })
        materialId = created.id
      } else {
        await updateRecord('materials', materialId, basePayload)
      }

      if (imageFile && materialId && usageType === 'materia_prima') {
        imageUrl = await uploadMaterialImage(imageFile, materialId)
        await updateRecord('materials', materialId, { image_url: imageUrl })
      } else if (removeImage && materialId && usageType === 'materia_prima') {
        await updateRecord('materials', materialId, { image_url: null })
      }

      toast.success(editing ? 'Material atualizado!' : 'Material cadastrado!')

      const returnTo = returnAfterCreateRef.current
      if (!editing && returnTo && materialId) {
        returnAfterCreateRef.current = null
        closeMaterialDialog()
        navigate(returnTo, {
          state: {
            newMaterial: {
              id: materialId,
              name: matForm.name.trim(),
              unit_cost: Number(basePayload.unit_cost ?? matForm.unit_cost),
              supplier_id: (basePayload.supplier_id as string | null) ?? null,
            },
          },
        })
        return
      }

      closeMaterialDialog()
      refreshInventory()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (material: Material) => {
    if (!await confirm({
      title: 'Excluir material',
      message: `Deseja excluir o material "${material.name}"? Esta ação não pode ser desfeita.`,
    })) return
    try {
      await softDelete('materials', material.id)
      toast.success('Material excluído')
      refreshInventory()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const registerMovement = async (materialId: string) => {
    try {
      const { error } = await supabase.from('stock_movements').insert({
        material_id: materialId,
        movement_type: movForm.movement_type,
        quantity: movForm.quantity,
        department_id: movForm.department_id || null,
        responsible_id: userId,
        notes: movForm.notes,
      })
      if (error) throw error
      toast.success('Movimentação registrada!')
      setMovDialog(null)
      refreshInventory()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const getTableColumns = useCallback((tab: MaterialUsageType): Column<Material>[] => {
    const actionsColumn: Column<Material> = {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Entrada"
            onClick={() => { setMovDialog(r.id); setMovForm({ ...movForm, movement_type: 'entrada' }) }}
          >
            <ArrowDown className="h-4 w-4 text-green-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Saída"
            onClick={() => { setMovDialog(r.id); setMovForm({ ...movForm, movement_type: 'saida' }) }}
          >
            <ArrowUp className="h-4 w-4 text-red-400" />
          </Button>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Excluir" onClick={() => void handleDelete(r)}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    }

    const statusColumn: Column<Material> = {
      key: 'status',
      header: '',
      render: (r) => {
        const status = stockStatus(r)
        if (status === 'inactive') return <Badge variant="secondary">Inativo</Badge>
        if (status === 'critical') return <Badge variant="danger">Crítico</Badge>
        if (status === 'over') return <Badge variant="warning">Acima do máx.</Badge>
        return <Badge variant="success">OK</Badge>
      },
    }

    const stockColumn: Column<Material> = {
      key: 'current_stock',
      header: 'Estoque',
      render: (r) => {
        const status = stockStatus(r)
        return (
          <span className={
            status === 'critical' ? 'font-bold text-red-400'
              : status === 'over' ? 'font-medium text-amber-400'
                : ''
          }>
            {r.current_stock} {r.unit}
          </span>
        )
      },
    }

    if (tab === 'consumo') {
      return [
        {
          key: 'name',
          header: 'Material',
          render: (r) => (
            <div className="min-w-0">
              <p className="truncate font-medium">{r.name}</p>
              {r.notes && <p className="truncate text-xs text-gray-500">{r.notes}</p>}
            </div>
          ),
        },
        {
          key: 'category',
          header: 'Categoria',
          render: (r) => getCategoryLabel(r.category),
        },
        {
          key: 'location',
          header: 'Local',
          render: (r) => r.location ?? '—',
        },
        stockColumn,
        {
          key: 'min_stock',
          header: 'Mínimo',
          render: (r) => String(r.min_stock),
        },
        statusColumn,
        actionsColumn,
      ]
    }

    return [
      {
        key: 'name',
        header: 'Material',
        render: (r) => (
          <div className="flex min-w-0 items-center gap-3">
            {r.image_url ? (
              <img
                src={r.image_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-gray-500">
                <ImagePlus className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{r.name}</p>
              <p className="truncate text-xs text-gray-500">
                {[r.code, r.brand, r.specification].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Categoria',
        render: (r) => getCategoryLabel(r.category),
      },
      {
        key: 'location',
        header: 'Local',
        render: (r) => r.location ?? '—',
      },
      stockColumn,
      {
        key: 'min_stock',
        header: 'Mín / Máx',
        render: (r) => `${r.min_stock}${r.max_stock != null ? ` / ${r.max_stock}` : ''}`,
      },
      {
        key: 'unit_cost',
        header: 'Valor ref.',
        render: (r) => formatCurrency(r.unit_cost),
      },
      {
        key: 'supplier',
        header: 'Fornecedor',
        render: (r) => resolveSupplier(r.supplier)?.name ?? '—',
      },
      statusColumn,
      actionsColumn,
    ]
  }, [movForm, getCategoryLabel])

  const renderTabPanel = (usageType: MaterialUsageType) => {
    const categories = usageType === 'consumo'
      ? consumoCategories.map((c) => ({ value: c.value, label: c.label }))
      : materiaPrimaCategories.map((c) => ({ value: c.value, label: c.label }))

    return (
    <TabsContent value={usageType} className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={usageType === 'consumo' ? 'Buscar material...' : 'Buscar nome, código, marca...'}
          className="mb-0 flex-1"
        >
          <Select
            value={categoryFilter || SELECT_NONE}
            onValueChange={(v) => setCategoryFilter(v === SELECT_NONE ? '' : v)}
          >
            <SelectTrigger className="h-9 w-full sm:w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE}>Todas categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
            <SelectTrigger className="h-9 w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </TableToolbar>
        <Button className="shrink-0" onClick={() => openCreate(usageType)}>
          <Plus className="mr-1 h-4 w-4" />
          {usageType === 'consumo' ? 'Novo item' : 'Novo material'}
        </Button>
      </div>
      <DataTable
        columns={getTableColumns(usageType)}
        data={materials}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </TabsContent>
    )
  }

  return (
    <PageContent>
      <PageHeader
        title="Almoxarifado & Estoque"
        description="Matéria-prima e materiais de uso e consumo"
      />

      <div className="mb-4">
        <StockAlertsPanel items={lowStockItems} loading={lowStockLoading} />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as MaterialUsageType)}
      >
        <TabsList>
          <TabsTrigger value="materia_prima">Matéria-prima</TabsTrigger>
          <TabsTrigger value="consumo">Uso e consumo</TabsTrigger>
        </TabsList>
        {renderTabPanel('materia_prima')}
        {renderTabPanel('consumo')}
      </Tabs>

      <Dialog open={matDialog} onOpenChange={(open) => { if (!open) closeMaterialDialog(); else setMatDialog(true) }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar' : 'Novo'}
              {' '}
              {dialogUsageType === 'consumo' ? 'item' : 'material'}
              {' — '}
              {getMaterialUsageTypeLabel(dialogUsageType)}
            </DialogTitle>
            <DialogDescription>
              {dialogUsageType === 'consumo'
                ? (editing ? 'Atualize as informações básicas do item' : 'Cadastro rápido para materiais de uso e consumo')
                : (editing ? 'Atualize os dados do material' : 'Preencha os dados para cadastrar um novo material')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {dialogUsageType === 'consumo' ? (
              <>
                <div>
                  <Label>Nome *</Label>
                  <Input value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={matForm.category} onValueChange={(v) => setMatForm({ ...matForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {consumoCategories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unidade</Label>
                    <Select value={matForm.unit} onValueChange={(v) => setMatForm({ ...matForm, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONSUMPTION_UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Estoque mínimo</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={matForm.min_stock}
                      onChange={(e) => setMatForm({ ...matForm, min_stock: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Localização</Label>
                    <Input
                      value={matForm.location}
                      onChange={(e) => setMatForm({ ...matForm, location: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={matForm.notes}
                    onChange={(e) => setMatForm({ ...matForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2">
                  <Label className="text-sm">Item ativo</Label>
                  <Switch
                    checked={matForm.is_active}
                    onCheckedChange={(is_active) => setMatForm({ ...matForm, is_active })}
                  />
                </div>
              </>
            ) : (
              <>
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gold/80">Identificação</p>
              <div>
                <Label>Nome *</Label>
                <Input value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Código / SKU</Label>
                <Input
                  value={matForm.code}
                  onChange={(e) => setMatForm({ ...matForm, code: e.target.value.toUpperCase() })}
                  placeholder="MDF-18-BRAN"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={matForm.category} onValueChange={(v) => setMatForm({ ...matForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materiaPrimaCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Especificação</Label>
                <Input
                  value={matForm.specification}
                  onChange={(e) => setMatForm({ ...matForm, specification: e.target.value })}
                  placeholder="Ex.: 18mm, branco, chapa 2750×1850"
                />
              </div>
              <div>
                <Label>Marca</Label>
                <Input
                  value={matForm.brand}
                  onChange={(e) => setMatForm({ ...matForm, brand: e.target.value })}
                  placeholder="Ex.: Duratex, Häfele"
                />
              </div>
            </section>

            <section className="space-y-3 border-t border-border/40 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gold/80">Estoque</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unidade</Label>
                  <Select value={matForm.unit} onValueChange={(v) => setMatForm({ ...matForm, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Localização</Label>
                  <Input
                    value={matForm.location}
                    onChange={(e) => setMatForm({ ...matForm, location: e.target.value })}
                    placeholder="Prateleira, corredor..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estoque mínimo</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.001}
                    value={matForm.min_stock}
                    onChange={(e) => setMatForm({ ...matForm, min_stock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Estoque máximo</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.001}
                    value={matForm.max_stock}
                    onChange={(e) => setMatForm({
                      ...matForm,
                      max_stock: e.target.value === '' ? '' : Number(e.target.value),
                    })}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t border-border/40 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gold/80">Compras</p>
              <div>
                <Label>Fornecedor preferencial</Label>
                <Select
                  value={matForm.supplier_id || SELECT_NONE}
                  onValueChange={(v) => setMatForm({ ...matForm, supplier_id: v === SELECT_NONE ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor unitário (ref.)</Label>
                <CurrencyInput
                  value={matForm.unit_cost}
                  onChange={(unit_cost) => setMatForm({ ...matForm, unit_cost })}
                />
              </div>
              {editing && editing.last_purchase_price != null && (
                <p className="text-xs text-gray-500">
                  Última compra: {formatCurrency(editing.last_purchase_price)}
                  {editing.last_purchase_at ? ` em ${formatDate(editing.last_purchase_at)}` : ''}
                </p>
              )}
            </section>

            <section className="space-y-3 border-t border-border/40 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gold/80">Outros</p>
              <div>
                <Label>Foto do material</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files?.[0])}
                />
                <div className="flex flex-wrap items-center gap-3">
                  {imagePreview && !removeImage ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Prévia"
                        className="h-20 w-20 rounded-lg border border-border object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -right-2 -top-2 rounded-full bg-surface-elevated p-1 text-gray-400 hover:text-red-400"
                        onClick={handleRemoveImage}
                        aria-label="Remover foto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border bg-surface-elevated text-gray-500">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {imagePreview && !removeImage ? 'Trocar foto' : 'Carregar foto'}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG ou WebP — máx. 5 MB</p>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={matForm.notes}
                  onChange={(e) => setMatForm({ ...matForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Detalhes adicionais, cuidados no armazenamento..."
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2">
                <div>
                  <Label className="text-sm">Material ativo</Label>
                  <p className="text-xs text-gray-500">Inativos ficam ocultos na listagem padrão</p>
                </div>
                <Switch
                  checked={matForm.is_active}
                  onCheckedChange={(is_active) => setMatForm({ ...matForm, is_active })}
                />
              </div>
            </section>
              </>
            )}

            <Button className="w-full" disabled={submitting} onClick={() => void saveMaterial()}>
              {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {movDialog && (
        <Dialog open={!!movDialog} onOpenChange={() => setMovDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{movForm.movement_type === 'entrada' ? 'Entrada' : 'Saída'} de Estoque</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.001}
                  value={movForm.quantity}
                  onChange={(e) => setMovForm({ ...movForm, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Setor (distribuição)</Label>
                <Select value={movForm.department_id} onValueChange={(v) => setMovForm({ ...movForm, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Input value={movForm.notes} onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })} />
              </div>
              <Button onClick={() => void registerMovement(movDialog)} className="w-full">Confirmar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <ConfirmDialog {...dialogProps} />
    </PageContent>
  )
}
