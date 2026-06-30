import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Pencil, CreditCard, TrendingUp, TrendingDown, Wallet, Trash2 } from 'lucide-react'
import { parseISO } from 'date-fns'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LumberCreditMovementForm } from '@/components/lumberyard-credit/LumberCreditMovementForm'
import {
  createEmptyLumberCreditForm,
  getLumberCreditFormFields,
  sanitizeLumberCreditPayload,
  validateLumberCreditForm,
  type LumberCreditFormState,
} from '@/lib/lumberyard-credit-form.schema'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LUMBER_CREDIT_MOVEMENT_TYPES,
  SELECT_NONE,
} from '@/lib/constants'
import { hasPermission } from '@/lib/permissions'
import { formatCurrency, formatDate, formatInstallment } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useConfirm } from '@/hooks/useConfirm'
import {
  useLookupClients,
  useLookupMaterials,
  useLookupOrders,
  useLookupSuppliers,
  useLumberCreditAllMovements,
  useLumberCreditMovements,
  useLumberCreditStats,
} from '@/hooks/useQueries'
import {
  saveLumberCreditMovement,
  deleteLumberCreditMovement,
  withRunningBalances,
  type LumberCreditMovement,
  type LumberCreditMovementType,
} from '@/services/lumberyard-credit.service'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

const emptyForm = createEmptyLumberCreditForm()

function toSelectValue(id: string) {
  return id || SELECT_NONE
}

function fromSelectValue(value: string) {
  return value === SELECT_NONE ? '' : value
}

function movementLabel(type: LumberCreditMovementType) {
  return LUMBER_CREDIT_MOVEMENT_TYPES.find((t) => t.value === type)?.label ?? type
}

export function LumberyardCreditPage() {
  const { confirm, dialogProps } = useConfirm()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const canWrite = hasPermission(role, 'lumber_credit.*')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LumberCreditMovement | null>(null)
  const [form, setForm] = useState<LumberCreditFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all')
  const [filterClient, setFilterClient] = useState('')
  const [filterType, setFilterType] = useState<LumberCreditMovementType | 'all'>('all')
  const [page, setPage] = useState(1)

  const debouncedFilters = useDebouncedValue(
    { year: filterYear, month: filterMonth, clientId: filterClient || undefined, movementType: filterType },
    350
  )

  const { data: clients = [] } = useLookupClients()
  const { data: orders = [] } = useLookupOrders()
  const { data: suppliers = [] } = useLookupSuppliers()
  const { data: materials = [] } = useLookupMaterials()
  const { data: statsData } = useLumberCreditStats()
  const { data: allMovements = [] } = useLumberCreditAllMovements()
  const { data: listResult, isLoading, isFetching } = useLumberCreditMovements(debouncedFilters, page)

  const movements = listResult?.data ?? []
  const totalPages = listResult?.totalPages ?? 1
  const stats = statsData ?? { totalEntrada: 0, totalSaida: 0, balance: 0 }

  const rows = useMemo(() => withRunningBalances(movements, allMovements), [movements, allMovements])

  const yearOptions = useMemo(() => {
    const years = new Set(movements.map((m) => parseISO(m.movement_date).getFullYear()))
    years.add(new Date().getFullYear())
    return [...years].sort((a, b) => b - a)
  }, [movements])

  useEffect(() => {
    setPage(1)
  }, [debouncedFilters])

  const refreshCredit = async () => {
    await queryClient.invalidateQueries({ queryKey: ['lumber-credit'] })
  }

  const openCreate = (type: LumberCreditMovementType = 'entrada') => {
    setEditing(null)
    setForm(createEmptyLumberCreditForm(type))
    setDialogOpen(true)
  }

  const openEdit = (row: LumberCreditMovement) => {
    setEditing(row)
    setForm({
      movement_type: row.movement_type,
      amount: Number(row.amount),
      movement_date: row.movement_date,
      client_id: row.client_id ?? '',
      order_id: row.order_id ?? '',
      supplier_id: row.supplier_id ?? '',
      material_id: row.material_id ?? '',
      material_description: row.material_description ?? '',
      quantity: row.quantity ?? '',
      invoice_number: row.invoice_number ?? '',
      installment_number: row.installment_number ?? '',
      installment_total: row.installment_total ?? '',
      payment_method: row.payment_method ?? (row.movement_type === 'entrada' ? 'cartao' : ''),
      notes: row.notes ?? '',
      auto_sync: false,
    })
    setDialogOpen(true)
  }

  const onSubmit = async () => {
    const fields = getLumberCreditFormFields(form, { isEditing: Boolean(editing) })
    const validationError = validateLumberCreditForm(form, fields)
    if (validationError) {
      toast.error(validationError)
      return
    }
    if (
      form.movement_type === 'saida' &&
      !editing &&
      Number(form.amount) > stats.balance &&
      !window.confirm(
        `O valor (${formatCurrency(form.amount)}) excede o saldo disponível (${formatCurrency(stats.balance)}). Deseja registrar mesmo assim?`
      )
    ) {
      return
    }

    setSubmitting(true)
    try {
      const payload = sanitizeLumberCreditPayload(form)
      const autoSync = form.movement_type === 'saida' && form.auto_sync && !editing

      if (editing) {
        await saveLumberCreditMovement({ ...payload, created_by: userId ?? null }, { editingId: editing.id })
        toast.success('Movimentação atualizada!')
      } else {
        const saved = await saveLumberCreditMovement(
          { ...payload, created_by: userId ?? null },
          { autoSync, userId }
        )
        if (autoSync && saved.purchase?.number) {
          toast.success(`Movimentação registrada! Compra #${saved.purchase.number} criada e estoque atualizado.`)
        } else {
          toast.success('Movimentação registrada!')
        }
      }
      setDialogOpen(false)
      setEditing(null)
      await refreshCredit()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row: LumberCreditMovement) => {
    const label = detailLabel(row)
    const purchaseWarning = row.purchase?.number
      ? ` Há uma compra vinculada (#${row.purchase.number}) — a exclusão não remove a compra nem reverte o estoque.`
      : ''
    if (!await confirm({
      title: 'Excluir movimentação',
      message: `Deseja excluir esta ${movementLabel(row.movement_type).toLowerCase()} (${label})?${purchaseWarning} Esta ação não pode ser desfeita.`,
    })) return
    try {
      await deleteLumberCreditMovement(row.id)
      toast.success('Movimentação excluída')
      await refreshCredit()
    } catch (e) {
      const err = e as { code?: string; message?: string }
      const message = err.message ?? (e instanceof Error ? e.message : 'Erro ao excluir')
      toast.error(
        err.code === '42501' || message.includes('403') || message.toLowerCase().includes('permission')
          ? 'Sem permissão para excluir. Execute a migration 033_lumberyard_credit_soft_delete_fix.sql no Supabase.'
          : message,
      )
    }
  }

  const detailLabel = (row: LumberCreditMovement) => {
    if (row.movement_type === 'entrada') {
      const parts: string[] = []
      if (row.client?.name) parts.push(row.client.name)
      if (row.order?.number) parts.push(`Pedido #${row.order.number}`)
      if (row.installment_number && row.installment_total) {
        parts.push(`Cartão ${formatInstallment(row.installment_number, row.installment_total)}`)
      }
      return parts.join(' · ') || 'Entrada de crédito'
    }
    const mat = row.material?.name ?? row.material_description
    const qty = row.quantity ? ` (${row.quantity})` : ''
    return mat ? `${mat}${qty}` : 'Saída de material'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crédito da Madereira"
        description="Controle de passagens no cartão e uso do crédito em materiais"
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openCreate('saida')}>
                <Plus className="h-4 w-4" /> Saída (material)
              </Button>
              <Button onClick={() => openCreate('entrada')}>
                <Plus className="h-4 w-4" /> Entrada (cartão)
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total passado (cartão)" value={formatCurrency(stats.totalEntrada)} icon={CreditCard} highlight />
        <StatCard title="Total utilizado" value={formatCurrency(stats.totalSaida)} icon={TrendingDown} />
        <StatCard title="Saldo disponível" value={formatCurrency(stats.balance)} icon={Wallet} highlight={stats.balance > 0} />
        <StatCard
          title="Utilização"
          value={stats.totalEntrada > 0 ? `${((stats.totalSaida / stats.totalEntrada) * 100).toFixed(0)}%` : '0%'}
          icon={TrendingUp}
          subtitle="Do crédito já utilizado"
        />
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">Extrato</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={toSelectValue(filterClient)} onValueChange={(v) => setFilterClient(fromSelectValue(v))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>Todos clientes</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as LumberCreditMovementType | 'all')}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'date', header: 'Data', render: (r) => formatDate(r.movement_date) },
              {
                key: 'type',
                header: 'Tipo',
                render: (r) => (
                  <Badge variant={r.movement_type === 'entrada' ? 'success' : 'warning'}>
                    {movementLabel(r.movement_type)}
                  </Badge>
                ),
              },
              { key: 'detail', header: 'Detalhe', render: (r) => detailLabel(r) },
              {
                key: 'integration',
                header: 'Integração',
                render: (r) => r.purchase?.number ? (
                  <Link to="/compras" className="text-sm text-gold hover:underline">
                    Compra #{r.purchase.number}
                  </Link>
                ) : r.movement_type === 'saida' ? '—' : null,
              },
              {
                key: 'amount',
                header: 'Valor',
                render: (r) => (
                  <span className={r.movement_type === 'entrada' ? 'text-green-400' : 'text-red-400'}>
                    {r.movement_type === 'entrada' ? '+' : '−'}{formatCurrency(r.amount)}
                  </span>
                ),
              },
              {
                key: 'balance',
                header: 'Saldo após',
                render: (r) => <span className="font-medium text-gold">{formatCurrency(r.balanceAfter)}</span>,
              },
              { key: 'nf', header: 'NF', render: (r) => r.invoice_number || '—' },
              {
                key: 'actions',
                header: '',
                render: (r) => canWrite ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} aria-label="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void handleDelete(r)} aria-label="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                ) : null,
              },
            ]}
            data={rows}
            loading={isLoading || isFetching}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar movimentação' : form.movement_type === 'entrada' ? 'Entrada de crédito (cartão)' : 'Saída de crédito (material)'}
            </DialogTitle>
          </DialogHeader>
          <LumberCreditMovementForm
            form={form}
            setForm={setForm}
            onSubmit={() => void onSubmit()}
            submitting={submitting}
            editing={editing}
            clients={clients}
            orders={orders}
            suppliers={suppliers}
            materials={materials}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
