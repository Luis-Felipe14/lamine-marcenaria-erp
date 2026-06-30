import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, FileDown, Trash2, Package, Pencil, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { BUDGET_STATUSES, getBudgetStatusLabel } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import { exportBudgetPDF, type BudgetPdfDetailLevel } from '@/lib/export'
import { useConfirm } from '@/hooks/useConfirm'
import { useBudgets, useLookupClients } from '@/hooks/useQueries'
import type { Budget } from '@/services/budgets.service'
import { MaterialPickerDialog } from '@/components/budgets/MaterialPickerDialog'
import type { BudgetMaterialOption } from '@/services/lookups.service'

interface BudgetItemForm {
  description: string
  material: string
  material_id: string | null
  quantity: number
  unit_price: number
}

const emptyItem = (): BudgetItemForm => ({
  description: '',
  material: '',
  material_id: null,
  quantity: 1,
  unit_price: 0,
})

const BUDGET_LOCKED_STATUSES = ['convertido_pedido', 'aprovado'] as const

const emptyForm = () => ({
  client_id: '',
  project_name: '',
  environment: '',
  measurements: '',
  labor_cost: 0,
  discount: 0,
  notes: '',
  items: [emptyItem()],
})

export function BudgetsPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const { data: listResult, isLoading: loading, isFetching } = useBudgets(page)
  const budgets = listResult?.data ?? []
  const totalPages = listResult?.totalPages ?? 1
  const { data: clients = [] } = useLookupClients()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [materialPickerIndex, setMaterialPickerIndex] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [pdfBudget, setPdfBudget] = useState<Budget | null>(null)
  const [pdfDetailLevel, setPdfDetailLevel] = useState<BudgetPdfDetailLevel>('materiais')
  const [pdfExporting, setPdfExporting] = useState(false)

  const refreshBudgets = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['budgets'] })
  }, [queryClient])

  useEffect(() => {
    const leadId = searchParams.get('lead')
    if (leadId) {
      setEditing(null)
      setForm(emptyForm())
      setDialogOpen(true)
    }
  }, [searchParams])

  const calculateTotal = () => {
    const itemsTotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    return itemsTotal + form.labor_cost - form.discount
  }

  const isBudgetLocked = (status: string) =>
    (BUDGET_LOCKED_STATUSES as readonly string[]).includes(status)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = async (budget: Budget) => {
    if (isBudgetLocked(budget.status)) {
      toast.error('Orçamentos convertidos em pedido não podem ser editados')
      return
    }
    setEditing(budget)
    setDialogOpen(true)
    setFormLoading(true)
    try {
      const [{ data: full, error: budgetError }, { data: items, error: itemsError }] = await Promise.all([
        supabase.from('budgets').select('*').eq('id', budget.id).single(),
        supabase.from('budget_items').select('*').eq('budget_id', budget.id).order('created_at'),
      ])
      if (budgetError) throw budgetError
      if (itemsError) throw itemsError
      const row = full as {
        client_id: string
        project_name: string
        environment: string | null
        measurements: string | null
        labor_cost: number
        discount: number
        notes: string | null
      }
      setForm({
        client_id: row.client_id,
        project_name: row.project_name,
        environment: row.environment ?? '',
        measurements: row.measurements ?? '',
        labor_cost: row.labor_cost ?? 0,
        discount: row.discount ?? 0,
        notes: row.notes ?? '',
        items: (items ?? []).length > 0
          ? (items ?? []).map((item) => ({
              description: item.description,
              material: item.material ?? '',
              material_id: null,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
            }))
          : [emptyItem()],
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar orçamento')
      setDialogOpen(false)
      setEditing(null)
    } finally {
      setFormLoading(false)
    }
  }

  const saveBudgetItems = async (budgetId: string) => {
    const { error: deleteError } = await supabase.from('budget_items').delete().eq('budget_id', budgetId)
    if (deleteError) throw deleteError

    const validItems = form.items.filter((item) => item.description.trim())
    if (validItems.length === 0) return

    const { error: insertError } = await supabase.from('budget_items').insert(
      validItems.map((item) => ({
        budget_id: budgetId,
        description: item.description.trim(),
        material: item.material || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      })),
    )
    if (insertError) throw insertError
  }

  const onSubmit = async () => {
    if (!form.client_id || !form.project_name.trim()) {
      toast.error('Cliente e projeto são obrigatórios')
      return
    }
    if (!form.items.some((item) => item.description.trim())) {
      toast.error('Adicione pelo menos um item com descrição')
      return
    }
    setSubmitting(true)
    try {
      const materials_cost = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const payload = {
        client_id: form.client_id,
        project_name: form.project_name.trim(),
        environment: form.environment.trim() || null,
        measurements: form.measurements.trim() || null,
        labor_cost: form.labor_cost,
        materials_cost,
        discount: form.discount,
        total_value: calculateTotal(),
        notes: form.notes.trim() || null,
      }

      if (editing) {
        await updateRecord('budgets', editing.id, payload)
        await saveBudgetItems(editing.id)
        toast.success('Orçamento atualizado!')
      } else {
        const budget = await createRecord('budgets', {
          ...payload,
          lead_id: searchParams.get('lead') || null,
          status: 'em_analise',
        })
        await saveBudgetItems((budget as { id: string }).id)
        toast.success('Orçamento criado!')
      }
      setDialogOpen(false)
      setEditing(null)
      refreshBudgets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateRecord('budgets', id, {
        status,
        ...(status === 'convertido_pedido' ? { approved_at: new Date().toISOString() } : {}),
      })
      if (status === 'convertido_pedido') {
        const budget = budgets.find((b) => b.id === id)
        if (budget) {
          const { data: existing } = await supabase.from('orders').select('id').eq('budget_id', id).is('deleted_at', null).maybeSingle()
          if (!existing) {
            await createRecord('orders', {
              client_id: budget.client_id,
              budget_id: id,
              value: budget.total_value,
              status: 'projeto_desenvolvimento',
            })
            toast.success('Pedido criado!')
          } else {
            toast.info('Pedido já existe para este orçamento')
          }
        }
      }
      refreshBudgets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar status')
    }
  }

  const handleDelete = async (budget: Budget) => {
    if (!await confirm({
      title: 'Excluir orçamento',
      message: `Deseja excluir o orçamento #${budget.number}? Esta ação não pode ser desfeita.`,
    })) return
    try {
      await softDelete('budgets', budget.id)
      toast.success('Orçamento excluído')
      refreshBudgets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const handleMaterialSelect = (material: BudgetMaterialOption) => {
    if (materialPickerIndex === null) return
    const items = [...form.items]
    items[materialPickerIndex] = {
      ...items[materialPickerIndex],
      material: material.name,
      material_id: material.id,
      unit_price: material.unit_cost,
    }
    setForm({ ...form, items })
    setMaterialPickerIndex(null)
  }

  const openPdfDialog = (budget: Budget) => {
    setPdfBudget(budget)
    setPdfDetailLevel('materiais')
    setPdfDialogOpen(true)
  }

  const runExportPdf = async (detailLevel: BudgetPdfDetailLevel) => {
    if (!pdfBudget) return
    setPdfExporting(true)
    try {
      const [{ data: full, error: budgetError }, { data: items, error: itemsError }] = await Promise.all([
        supabase
          .from('budgets')
          .select('*, client:clients(name, document, phone, whatsapp, email, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip)')
          .eq('id', pdfBudget.id)
          .single(),
        supabase.from('budget_items').select('*').eq('budget_id', pdfBudget.id),
      ])
      if (budgetError) throw budgetError
      if (itemsError) throw itemsError
      await exportBudgetPDF(full, items ?? [], { detailLevel })
      toast.success('PDF exportado!')
      setPdfDialogOpen(false)
      setPdfBudget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar PDF')
    } finally {
      setPdfExporting(false)
    }
  }

  return (
    <PageContent>
      <PageHeader title="Orçamentos" description="Gestão de propostas comerciais"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditing(null)
              setMaterialPickerIndex(null)
              setFormLoading(false)
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo Orçamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? `Editar Orçamento #${editing.number}` : 'Novo Orçamento'}</DialogTitle>
                <DialogDescription>
                  {editing ? 'Atualize os dados da proposta comercial' : 'Preencha os dados para criar uma nova proposta'}
                </DialogDescription>
              </DialogHeader>
              {formLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando orçamento...
                </div>
              ) : (
              <div className="space-y-4">
                <div>
                  <Label>Cliente</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Projeto</Label>
                    <Input
                      placeholder="Ex: Apartamento Laminê"
                      value={form.project_name}
                      onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                    />
                  </div>
                  <div><Label>Ambiente</Label><Input placeholder="Ex: Cozinha planejada" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Medidas</Label>
                  <Textarea
                    placeholder="Ex: Largura 3,20m × Altura 2,70m — detalhes de medidas do ambiente"
                    value={form.measurements}
                    onChange={(e) => setForm({ ...form, measurements: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Itens</Label>
                  {form.items.map((item, i) => (
                    <div key={i} className="mb-2 flex gap-2">
                      <div className="grid flex-1 grid-cols-4 gap-2">
                        <Input placeholder="Descrição" value={item.description} onChange={(e) => { const items = [...form.items]; items[i].description = e.target.value; setForm({ ...form, items }) }} />
                        <button
                          type="button"
                          onClick={() => setMaterialPickerIndex(i)}
                          className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 text-left text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] transition-all hover:border-gold/40 focus-visible:outline-none focus-visible:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/20 light:bg-white light:text-gray-900"
                        >
                          <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                          <span className={item.material ? 'truncate' : 'truncate text-gray-500'}>
                            {item.material || 'Material'}
                          </span>
                        </button>
                        <Input type="number" min={0} step="0.001" placeholder="Qtd" value={item.quantity} onChange={(e) => { const items = [...form.items]; items[i].quantity = Number(e.target.value); setForm({ ...form, items }) }} />
                        <CurrencyInput placeholder="Preço" value={item.unit_price} onChange={(unit_price) => { const items = [...form.items]; items[i].unit_price = unit_price; setForm({ ...form, items }) }} />
                      </div>
                      {form.items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeItem(i)} title="Remover item">
                          <X className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>+ Item</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Mão de Obra</Label><CurrencyInput value={form.labor_cost} onChange={(labor_cost) => setForm({ ...form, labor_cost })} /></div>
                  <div><Label>Desconto</Label><CurrencyInput value={form.discount} onChange={(discount) => setForm({ ...form, discount })} /></div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Condições, prazos ou detalhes adicionais da proposta"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <p className="text-lg font-bold text-gold">Total: {formatCurrency(calculateTotal())}</p>
                <Button onClick={onSubmit} className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Salvar Alterações' : 'Salvar Orçamento'}
                </Button>
              </div>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <TableToolbar panel />

      <PageDataZone>
      <DataTable
        columns={[
          { key: 'number', header: '#', render: (r) => `#${r.number}` },
          { key: 'client', header: 'Cliente', render: (r) => r.client?.name ?? '-' },
          { key: 'project_name', header: 'Projeto' },
          { key: 'total_value', header: 'Valor', render: (r) => formatCurrency(r.total_value) },
          { key: 'status', header: 'Status', render: (r) => <Badge>{getBudgetStatusLabel(r.status)}</Badge> },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-1">
              {!isBudgetLocked(r.status) && (
                <Button variant="ghost" size="icon" title="Editar" onClick={(e) => { e.stopPropagation(); void openEdit(r) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" title="Exportar PDF" onClick={(e) => { e.stopPropagation(); openPdfDialog(r) }}><FileDown className="h-4 w-4" /></Button>
              <Select
                value={r.status === 'aprovado' ? 'convertido_pedido' : r.status}
                onValueChange={(v) => updateStatus(r.id, v)}
              >
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{BUDGET_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(r) }}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          )},
        ]}
        data={budgets}
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
      <Dialog open={pdfDialogOpen} onOpenChange={(open) => {
        setPdfDialogOpen(open)
        if (!open) setPdfBudget(null)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar PDF</DialogTitle>
            <DialogDescription>
              {pdfBudget ? `Orçamento #${pdfBudget.number} — ${pdfBudget.project_name}` : 'Escolha o nível de detalhe do arquivo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPdfDetailLevel('materiais')}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                pdfDetailLevel === 'materiais'
                  ? 'border-gold/50 bg-gold/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <p className="font-medium text-white">Com materiais</p>
              <p className="mt-1 text-xs text-gray-500">
                Lista completa com descrição, material, quantidade e valores de cada item.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPdfDetailLevel('valores')}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                pdfDetailLevel === 'valores'
                  ? 'border-gold/50 bg-gold/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <p className="font-medium text-white">Somente valores</p>
              <p className="mt-1 text-xs text-gray-500">
                Apenas totais (materiais, mão de obra e valor final), sem listagem de itens.
              </p>
            </button>
            <Button className="w-full" disabled={pdfExporting} onClick={() => void runExportPdf(pdfDetailLevel)}>
              {pdfExporting ? 'Gerando PDF...' : 'Gerar PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <MaterialPickerDialog
        open={materialPickerIndex !== null}
        onOpenChange={(open) => { if (!open) setMaterialPickerIndex(null) }}
        onSelect={handleMaterialSelect}
      />
    </PageContent>
  )
}
