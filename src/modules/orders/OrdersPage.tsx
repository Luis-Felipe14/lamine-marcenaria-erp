import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { OrderTimeline } from '@/components/orders/OrderTimeline'
import { OrderKanbanCard } from '@/components/orders/OrderKanbanCard'
import { KanbanBoard } from '@/components/shared/KanbanBoard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { ORDER_STATUSES } from '@/lib/constants'
import { queryKeys } from '@/lib/query-keys'
import { invalidateDashboardMetrics } from '@/lib/invalidate-dashboard'
import { formatCurrency } from '@/lib/utils'
import { getOrderTimeline, type KanbanOrder, type OrderTimelineEvent } from '@/services/orders.service'
import { updateRecord, softDelete } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useConfirm } from '@/hooks/useConfirm'
import { useOrdersKanban } from '@/hooks/useQueries'

export function OrdersPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const { data: orders = [], isLoading: loading } = useOrdersKanban()
  const [selected, setSelected] = useState<KanbanOrder | null>(null)
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const userId = useAuthStore((s) => s.user?.id)

  const refreshOrders = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersKanban }),
      invalidateDashboardMetrics(queryClient),
    ])
  }, [queryClient])

  const columns = useMemo(
    () =>
      ORDER_STATUSES.filter((s) => s.value !== 'cancelado').map((status) => ({
        id: status.value,
        title: status.label,
        items: orders.filter((o) => o.status === status.value),
      })),
    [orders]
  )

  const renderCard = useCallback((order: KanbanOrder) => <OrderKanbanCard order={order} />, [])

  const loadTimeline = useCallback(async (orderId: string) => {
    setTimelineLoading(true)
    try {
      setTimeline(await getOrderTimeline(orderId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar histórico')
      setTimeline([])
    } finally {
      setTimelineLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (orderId: string, newStatus: string, oldStatus: string) => {
    if (newStatus === oldStatus) return

    queryClient.setQueryData<KanbanOrder[]>(queryKeys.ordersKanban, (prev) =>
      (prev ?? []).map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )
    if (selected?.id === orderId) {
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    setUpdating(true)
    try {
      await updateRecord('orders', orderId, { status: newStatus })

      const { error: histError } = await supabase.from('order_status_history').insert({
        order_id: orderId,
        from_status: oldStatus,
        to_status: newStatus,
        user_id: userId ?? null,
      })

      if (histError) {
        toast.warning('Status atualizado. Execute a migration 006 no Supabase para registrar o histórico.')
      } else {
        toast.success('Status atualizado')
      }

      await invalidateDashboardMetrics(queryClient)

      if (selected?.id === orderId) {
        await loadTimeline(orderId)
      }
    } catch (e) {
      queryClient.setQueryData<KanbanOrder[]>(queryKeys.ordersKanban, (prev) =>
        (prev ?? []).map((o) => (o.id === orderId ? { ...o, status: oldStatus } : o))
      )
      if (selected?.id === orderId) {
        setSelected((prev) => (prev ? { ...prev, status: oldStatus } : null))
      }
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar status')
    } finally {
      setUpdating(false)
    }
  }, [queryClient, selected, userId, loadTimeline])

  const openOrder = useCallback(async (order: KanbanOrder) => {
    setSelected(order)
    await loadTimeline(order.id)
  }, [loadTimeline])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Pedidos" description="Kanban e linha do tempo de produção" />
      <KanbanBoard
        columns={columns}
        onCardClick={openOrder}
        onStatusChange={updateStatus}
        renderCard={renderCard}
      />

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Pedido #{selected.number}</DialogTitle>
              <DialogDescription>
                {selected.client?.name} — {formatCurrency(selected.value)}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2">
              <label className="text-sm text-gray-500">Alterar Status</label>
              <Select
                value={selected.status}
                disabled={updating}
                onValueChange={(v) => void updateStatus(selected.id, v, selected.status)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected.notes?.trim() && (
              <p className="mt-3 rounded-lg bg-surface-elevated px-3 py-2 text-sm text-gray-400">
                {selected.notes}
              </p>
            )}

            <Button
              variant="destructive"
              size="sm"
              className="mt-2"
              onClick={async () => {
                if (!selected) return
                if (!await confirm({
                  title: 'Excluir pedido',
                  message: `Deseja excluir o pedido #${selected.number}? Esta ação não pode ser desfeita.`,
                })) return
                try {
                  await softDelete('orders', selected.id)
                  toast.success('Pedido excluído')
                  setSelected(null)
                  await refreshOrders()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
                }
              }}
            >
              Excluir pedido
            </Button>

            <h4 className="mt-5 font-medium text-gold">Linha do tempo</h4>
            <p className="mb-3 text-xs text-gray-500">
              Orçamento, pedido, alterações de status e ordens de produção vinculadas.
            </p>
            <OrderTimeline events={timeline} loading={timelineLoading} />
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
