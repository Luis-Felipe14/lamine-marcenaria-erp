import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Package, Warehouse, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MaterialPickerDialog } from '@/components/budgets/MaterialPickerDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { PURCHASE_STATUSES, SELECT_NONE } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { emptyToNull } from '@/lib/supabase-helpers'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import type { Purchase } from '@/services/purchases.service'
import type { BudgetMaterialOption } from '@/services/lookups.service'
import { useAuthStore } from '@/stores/authStore'
import { useConfirm } from '@/hooks/useConfirm'
import { useLookupSuppliers, usePurchases } from '@/hooks/useQueries'
import type { Column } from '@/components/shared/DataTable'

export function PurchasesPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const navigate = useNavigate()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const { data: listResult, isLoading: loading, isFetching } = usePurchases(page)
  const purchases = listResult?.data ?? []
  const totalPages = listResult?.totalPages ?? 1
  const { data: suppliers = [] } = useLookupSuppliers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const emptyForm = () => ({
    supplier_id: '',
    material_id: '',
    material_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    invoice_number: '',
  })
  const [form, setForm] = useState(emptyForm())
  const userId = useAuthStore((s) => s.user?.id)

  const refreshPurchases = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['purchases'] })
  }, [queryClient])

  const resetForm = () => setForm(emptyForm())

  const handleMaterialSelect = (material: BudgetMaterialOption) => {
    setForm((current) => ({
      ...current,
      material_id: material.id,
      material_name: material.name,
      unit_price: material.unit_cost,
      supplier_id: material.supplier_id ?? current.supplier_id,
    }))
  }

  useEffect(() => {
    const newMaterial = (location.state as { newMaterial?: BudgetMaterialOption } | null)?.newMaterial
    if (!newMaterial?.id) return

    handleMaterialSelect(newMaterial)
    setDialogOpen(true)
    toast.success('Material cadastrado e selecionado na compra.')
    navigate('/compras', { replace: true, state: null })
  }, [location.state, navigate])

  const onSubmit = async () => {
    if (!form.material_id) {
      toast.error('Selecione o material')
      return
    }
    if (form.quantity <= 0) {
      toast.error('Informe a quantidade')
      return
    }

    setSubmitting(true)
    try {
      await createRecord('purchases', emptyToNull({
        supplier_id: form.supplier_id || null,
        material_id: form.material_id,
        description: form.description.trim() || null,
        quantity: form.quantity,
        unit_price: form.unit_price,
        invoice_number: form.invoice_number.trim() || null,
        total_price: form.quantity * form.unit_price,
        status: 'solicitado',
        requested_by: userId ?? null,
      }))
      toast.success('Compra solicitada!')
      setDialogOpen(false)
      resetForm()
      refreshPurchases()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao solicitar compra'
      toast.error(message.includes('invalid input syntax for type uuid')
        ? 'Verifique fornecedor e material selecionados'
        : message)
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = useCallback(async (id: string, status: string) => {
    await updateRecord('purchases', id, { status })
    toast.success(status === 'recebido' ? 'Estoque atualizado automaticamente!' : 'Status atualizado')
    refreshPurchases()
  }, [refreshPurchases])

  const handleDelete = useCallback(async (purchase: Purchase) => {
    const label = purchase.material?.name ?? purchase.description ?? `#${purchase.number}`
    const receivedWarning = purchase.status === 'recebido'
      ? ' Esta compra já foi recebida e o estoque foi atualizado — a exclusão não reverte o saldo.'
      : ''
    if (!await confirm({
      title: 'Excluir compra',
      message: `Deseja excluir a compra #${purchase.number} (${label})?${receivedWarning} Esta ação não pode ser desfeita.`,
    })) return
    try {
      await softDelete('purchases', purchase.id)
      toast.success('Compra excluída')
      refreshPurchases()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }, [confirm, refreshPurchases])

  const columns = useMemo<Column<Purchase>[]>(() => [
    { key: 'number', header: '#', render: (r) => `#${r.number}` },
    { key: 'supplier', header: 'Fornecedor', render: (r) => r.supplier?.name ?? '-' },
    { key: 'material', header: 'Material', render: (r) => r.material?.name ?? r.description ?? '-' },
    { key: 'total_price', header: 'Total', render: (r) => formatCurrency(r.total_price) },
    { key: 'status', header: 'Status', render: (r) => (
      <Select value={r.status} onValueChange={(v) => void updateStatus(r.id, v)}>
        <SelectTrigger className="h-8 w-32"><Badge>{PURCHASE_STATUSES.find((s) => s.value === r.status)?.label}</Badge></SelectTrigger>
        <SelectContent>{PURCHASE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
    )},
    { key: 'actions', header: '', render: (r) => (
      <Button variant="ghost" size="icon" onClick={() => void handleDelete(r)} title="Excluir compra">
        <Trash2 className="h-4 w-4 text-red-400" />
      </Button>
    )},
  ], [updateStatus, handleDelete])

  return (
    <PageContent>
      <PageHeader title="Compras" description="Solicitações e recebimento de materiais"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova Compra</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Compra</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Material *</Label>
                  <button
                    type="button"
                    onClick={() => setMaterialPickerOpen(true)}
                    className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 text-left text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] transition-all hover:border-gold/40 focus-visible:outline-none focus-visible:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/20 light:bg-white light:text-gray-900"
                  >
                    <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                    <span className={form.material_name ? 'truncate' : 'truncate text-gray-500'}>
                      {form.material_name || 'Selecionar material'}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => navigate('/estoque?cadastrar=materia_prima&retorno=compras')}
                  >
                    <Warehouse className="mr-1 h-4 w-4" />
                    Cadastrar material no estoque
                  </Button>
                  <p className="mt-1 text-xs text-gray-500">
                    Material ainda não cadastrado? Cadastre no estoque e volte para concluir a compra.
                  </p>
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <Select
                    value={form.supplier_id || SELECT_NONE}
                    onValueChange={(v) => setForm({ ...form, supplier_id: v === SELECT_NONE ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>Não informado</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-gray-500">Preenchido automaticamente se o material tiver fornecedor preferencial</p>
                </div>
                <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Quantidade</Label><Input type="number" min={0} step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                  <div><Label>Valor Unitário</Label><CurrencyInput value={form.unit_price} onChange={(unit_price) => setForm({ ...form, unit_price })} /></div>
                </div>
                <div><Label>Nota Fiscal</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
                <p className="text-gold font-bold">Total: {formatCurrency(form.quantity * form.unit_price)}</p>
                <Button onClick={() => void onSubmit()} className="w-full" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Solicitar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <MaterialPickerDialog
        open={materialPickerOpen}
        onOpenChange={setMaterialPickerOpen}
        onSelect={handleMaterialSelect}
      />

      <TableToolbar panel />

      <PageDataZone>
      <DataTable
        columns={columns}
        data={purchases}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      {isFetching && !loading && (
        <p className="mt-2 text-center text-[10px] text-gray-600">Atualizando...</p>
      )}
      </PageDataZone>

      <ConfirmDialog {...dialogProps} />
    </PageContent>
  )
}
