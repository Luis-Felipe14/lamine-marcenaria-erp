import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  DEFAULT_PRODUCTION_CHECKLIST,
  PRODUCTION_STATUSES,
} from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import {
  parseChecklist,
  type ProductionOrder,
  type OrderOption,
} from '@/services/production.service'
import { useConfirm } from '@/hooks/useConfirm'
import { useProductionOrderOptions, useProductionOrders } from '@/hooks/useQueries'
import { queryKeys } from '@/lib/query-keys'
import type { Column } from '@/components/shared/DataTable'

function formatOrderLabel(order: OrderOption) {
  const parts = [`#${order.number}`]
  if (order.client?.name) parts.push(order.client.name)
  if (order.budget?.project_name) parts.push(order.budget.project_name)
  else if (order.notes?.trim()) parts.push(order.notes.trim())
  return parts.join(' — ')
}

function checklistProgress(items: ReturnType<typeof parseChecklist>): string {
  if (items.length === 0) return '—'
  const done = items.filter((item) => item.done).length
  return `${done}/${items.length}`
}

export function ProductionPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const { data: ops = [], isLoading: loading } = useProductionOrders()
  const { data: orders = [] } = useProductionOrderOptions()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOp, setDetailOp] = useState<ProductionOrder | null>(null)
  const [detailSaving, setDetailSaving] = useState(false)
  const [form, setForm] = useState({ order_id: '', expected_end_date: '' })

  const refreshProduction = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.productionOrders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.productionOrderOptions }),
    ])
  }, [queryClient])

  const createOP = async () => {
    if (!form.order_id) {
      toast.error('Selecione um pedido')
      return
    }
    try {
      await createRecord('production_orders', {
        order_id: form.order_id,
        expected_end_date: form.expected_end_date || null,
        status: 'aberta',
        start_date: new Date().toISOString().split('T')[0],
        checklist: DEFAULT_PRODUCTION_CHECKLIST,
      })
      toast.success('OP criada!')
      setDialogOpen(false)
      setForm({ order_id: '', expected_end_date: '' })
      refreshProduction()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar OP'
      if (msg.includes('403') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('row-level')) {
        toast.error('Permissão negada. Execute a migration 008_fix_production_rls.sql no Supabase.')
      } else if (msg.toLowerCase().includes('checklist')) {
        toast.error('Execute a migration 035_production_checklist.sql no Supabase.')
      } else {
        toast.error(msg)
      }
    }
  }

  const handleDelete = async (op: ProductionOrder) => {
    const clientName = op.order?.client?.name
    const detail = clientName ? ` (pedido #${op.order?.number ?? '-'} — ${clientName})` : ''
    if (!await confirm({
      title: 'Excluir ordem de produção',
      message: `Deseja excluir a OP #${op.number}${detail}? Esta ação não pode ser desfeita.`,
    })) return
    try {
      await softDelete('production_orders', op.id)
      toast.success('OP excluída')
      if (detailOp?.id === op.id) setDetailOp(null)
      refreshProduction()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const openDetail = useCallback((op: ProductionOrder) => {
    setDetailOp({
      ...op,
      checklist: parseChecklist(op.checklist),
      notes: op.notes ?? '',
    })
  }, [])

  const columns = useMemo<Column<ProductionOrder>[]>(() => [
    { key: 'number', header: 'OP', render: (r) => `#${r.number}` },
    { key: 'order', header: 'Pedido', render: (r) => `#${r.order?.number ?? '-'}` },
    { key: 'client', header: 'Cliente', render: (r) => r.order?.client?.name ?? '-' },
    { key: 'status', header: 'Status', render: (r) => <Badge>{PRODUCTION_STATUSES.find((s) => s.value === r.status)?.label}</Badge> },
    { key: 'checklist', header: 'Checklist', render: (r) => checklistProgress(parseChecklist(r.checklist)) },
    { key: 'expected_end_date', header: 'Prazo', render: (r) => formatDate(r.expected_end_date) },
    { key: 'actions', header: '', render: (r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openDetail(r)} title="Detalhes da OP">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => void handleDelete(r)} title="Excluir OP">
          <Trash2 className="h-4 w-4 text-red-400" />
        </Button>
      </div>
    )},
  ], [openDetail, handleDelete])

  const toggleChecklistItem = (itemId: string, done: boolean) => {
    if (!detailOp) return
    setDetailOp({
      ...detailOp,
      checklist: (detailOp.checklist ?? []).map((item) =>
        item.id === itemId ? { ...item, done } : item),
    })
  }

  const saveDetail = async () => {
    if (!detailOp) return
    setDetailSaving(true)
    try {
      const allDone = (detailOp.checklist ?? []).length > 0 && (detailOp.checklist ?? []).every((item) => item.done)
      const payload = {
        status: detailOp.status,
        start_date: detailOp.start_date || null,
        expected_end_date: detailOp.expected_end_date || null,
        actual_end_date: detailOp.actual_end_date || null,
        notes: detailOp.notes?.trim() || null,
        checklist: detailOp.checklist ?? [],
        ...(allDone && detailOp.status !== 'concluida' && detailOp.status !== 'cancelada'
          ? {
              status: 'concluida',
              actual_end_date: detailOp.actual_end_date || new Date().toISOString().split('T')[0],
            }
          : {}),
      }
      await updateRecord('production_orders', detailOp.id, payload)
      toast.success('OP atualizada!')
      setDetailOp(null)
      refreshProduction()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar'
      if (msg.toLowerCase().includes('checklist')) {
        toast.error('Execute a migration 035_production_checklist.sql no Supabase.')
      } else {
        toast.error(msg)
      }
    } finally {
      setDetailSaving(false)
    }
  }

  return (
    <PageContent>
      <PageHeader title="Ordens de Produção" description="Controle das ordens de produção com checklist e observações"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova OP</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Ordem de Produção</DialogTitle>
                <DialogDescription>Vincule a OP a um pedido em andamento</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Pedido</Label>
                  <Select value={form.order_id} onValueChange={(v) => setForm({ ...form, order_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {formatOrderLabel(o)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Término Previsto</Label><Input type="date" value={form.expected_end_date} onChange={(e) => setForm({ ...form, expected_end_date: e.target.value })} /></div>
                <Button onClick={createOP} className="w-full">Criar OP</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <TableToolbar panel />

      <PageDataZone>
      <DataTable
        columns={columns}
        data={ops}
        loading={loading}
        onRowClick={openDetail}
      />
      </PageDataZone>

      <Dialog open={!!detailOp} onOpenChange={(open) => !open && setDetailOp(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {detailOp && (
            <>
              <DialogHeader>
                <DialogTitle>OP #{detailOp.number}</DialogTitle>
                <DialogDescription>
                  Pedido #{detailOp.order?.number ?? '-'} — {detailOp.order?.client?.name ?? 'Cliente'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={detailOp.status}
                    onValueChange={(status) => setDetailOp({ ...detailOp, status })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Início</Label>
                    <Input
                      type="date"
                      value={detailOp.start_date ?? ''}
                      onChange={(e) => setDetailOp({ ...detailOp, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Prazo</Label>
                    <Input
                      type="date"
                      value={detailOp.expected_end_date ?? ''}
                      onChange={(e) => setDetailOp({ ...detailOp, expected_end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Conclusão</Label>
                    <Input
                      type="date"
                      value={detailOp.actual_end_date ?? ''}
                      onChange={(e) => setDetailOp({ ...detailOp, actual_end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Checklist de produção</Label>
                  <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    {(detailOp.checklist ?? []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className={item.done ? 'text-gray-500 line-through' : 'text-white'}>
                          {item.label}
                        </span>
                        <Switch
                          checked={item.done}
                          onCheckedChange={(checked) => toggleChecklistItem(item.id, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={detailOp.notes ?? ''}
                    onChange={(e) => setDetailOp({ ...detailOp, notes: e.target.value })}
                    placeholder="Detalhes, pendências, ajustes..."
                  />
                </div>
                <Button className="w-full" disabled={detailSaving} onClick={() => void saveDetail()}>
                  {detailSaving ? 'Salvando...' : 'Salvar OP'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </PageContent>
  )
}
