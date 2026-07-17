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
  computeSaidaTotalAmount,
  getLumberCreditFormFields,
  sanitizeLumberCreditPayload,
  validateLumberCreditForm,
  withSaidaAmountFromLines,
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
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatCurrencyMasked } from '@/lib/secretary-access'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useConfirm } from '@/hooks/useConfirm'
import { useSecretaryAccess } from '@/hooks/useSecretaryAccess'
import {
  useLookupClients,
  useLookupMaterials,
  useLookupOrders,
  useLookupSuppliers,
  useLumberCreditAllMovements,
  useLumberCreditBalancesByClient,
  useLumberCreditMovements,
  useLumberCreditSettings,
  useLumberCreditStats,
} from '@/hooks/useQueries'
import {
  saveLumberCreditMovement,
  saveLumberCreditSaidaBatch,
  deleteLumberCreditMovement,
  formatLumberCreditMovementDetail,
  getLumberCreditPurchaseNumbers,
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
  const { canViewAmounts } = useSecretaryAccess()
  const money = (value: number) => formatCurrencyMasked(value, canViewAmounts, formatCurrency)

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
  const { data: settingsData } = useLumberCreditSettings()
  const { data: clientBalances = [] } = useLumberCreditBalancesByClient()
  const { data: statsData } = useLumberCreditStats(filterClient || undefined)
  const { data: allMovements = [] } = useLumberCreditAllMovements()
  const { data: listResult, isLoading, isFetching } = useLumberCreditMovements(debouncedFilters, page)

  const movements = listResult?.data ?? []
  const totalPages = listResult?.totalPages ?? 1
  const stats = statsData ?? { totalEntrada: 0, totalSaida: 0, balance: 0 }
  const allowCrossClient = settingsData?.allow_cross_client ?? false
  const statsSubtitle = filterClient
    ? clients.find((c) => c.id === filterClient)?.name ?? 'Cliente filtrado'
    : 'Todos os clientes'

  const rows = useMemo(
    () => withRunningBalances(movements, allMovements, { clientId: filterClient || undefined }),
    [movements, allMovements, filterClient],
  )

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

  const openCreate = (type: LumberCreditMovementType = 'entrada', prefillClientId = '') => {
    setEditing(null)
    const nextForm = createEmptyLumberCreditForm(type)
    if (prefillClientId) nextForm.client_id = prefillClientId
    setForm(nextForm)
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
      material_lines: row.material_lines?.map((line) => ({
        material_id: line.material_id,
        name: line.name,
        specification: line.specification,
        brand: line.brand,
        unit: line.unit,
        unit_price: line.unit_price,
        quantity: line.quantity,
        amount: line.amount,
        purchase_id: line.purchase_id,
        purchase_number: line.purchase_number,
      })) ?? [],
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
    const fields = getLumberCreditFormFields(form, {
      isEditing: Boolean(editing),
      allowCrossClient,
    })
    const validationError = validateLumberCreditForm(form, fields, { isEditing: Boolean(editing) })
    if (validationError) {
      toast.error(validationError)
      return
    }

    const submitForm = withSaidaAmountFromLines(form)
    const submitAmount = computeSaidaTotalAmount(submitForm)

    const clientBalance = submitForm.client_id
      ? clientBalances.find((row) => row.client_id === submitForm.client_id)?.balance ?? 0
      : stats.balance
    const availableBalance = submitForm.movement_type === 'saida' && submitForm.client_id
      ? clientBalance
      : stats.balance

    if (
      submitForm.movement_type === 'saida' &&
      !editing &&
      submitAmount > availableBalance &&
      !window.confirm(
        `O valor (${money(submitAmount)}) excede o saldo disponível (${money(availableBalance)}). Deseja registrar mesmo assim?`
      )
    ) {
      return
    }

    setSubmitting(true)
    try {
      const autoSync = submitForm.movement_type === 'saida' && submitForm.auto_sync && !editing

      if (editing) {
        const payload = sanitizeLumberCreditPayload(submitForm)
        await saveLumberCreditMovement({ ...payload, created_by: userId ?? null }, { editingId: editing.id })
        toast.success('Movimentação atualizada!')
      } else if (submitForm.movement_type === 'saida' && submitForm.material_lines.length > 0) {
        const saved = await saveLumberCreditSaidaBatch(submitForm, { autoSync, userId })
        const purchaseNumbers = getLumberCreditPurchaseNumbers(saved)
        if (autoSync && purchaseNumbers.length > 0) {
          toast.success(
            `Movimentação registrada com ${submitForm.material_lines.length} materiais! Compras #${purchaseNumbers.join(', #')} criadas.`,
          )
        } else {
          toast.success(`Movimentação registrada com ${submitForm.material_lines.length} materiais!`)
        }
      } else {
        const payload = sanitizeLumberCreditPayload(submitForm)
        const saved = await saveLumberCreditMovement(
          { ...payload, created_by: userId ?? null },
          { autoSync, userId },
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
    const label = formatLumberCreditMovementDetail(row)
    const purchaseNumbers = getLumberCreditPurchaseNumbers(row)
    const purchaseWarning = purchaseNumbers.length > 0
      ? ` Há ${purchaseNumbers.length > 1 ? 'compras vinculadas' : 'uma compra vinculada'} (#${purchaseNumbers.join(', #')}) — a exclusão não remove ${purchaseNumbers.length > 1 ? 'as compras' : 'a compra'} nem reverte o estoque.`
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
    const text = formatLumberCreditMovementDetail(row)
    const lines = row.material_lines ?? []

    if (row.movement_type === 'saida' && lines.length > 1) {
      const client = row.client?.name
      return (
        <div className="space-y-1">
          {client ? <p className="font-medium text-white">{client}</p> : null}
          <ul className="list-inside list-disc text-xs text-gray-400">
            {lines.map((line) => (
              <li key={line.material_id}>
                {line.name} — {line.quantity} {line.unit} ({money(line.amount)})
              </li>
            ))}
          </ul>
        </div>
      )
    }

    return text
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
        <StatCard title="Total passado (cartão)" value={money(stats.totalEntrada)} icon={CreditCard} highlight subtitle={statsSubtitle} />
        <StatCard title="Total utilizado" value={money(stats.totalSaida)} icon={TrendingDown} subtitle={statsSubtitle} />
        <StatCard title="Saldo disponível" value={money(stats.balance)} icon={Wallet} highlight={stats.balance > 0} subtitle={statsSubtitle} />
        <StatCard
          title="Utilização"
          value={
            canViewAmounts
              ? stats.totalEntrada > 0
                ? `${((stats.totalSaida / stats.totalEntrada) * 100).toFixed(0)}%`
                : '0%'
              : '•••'
          }
          icon={TrendingUp}
          subtitle={filterClient ? statsSubtitle : 'Do crédito já utilizado'}
        />
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Saldo por cliente</CardTitle>
            <p className="text-xs text-gray-500">
              {allowCrossClient
                ? 'Saídas podem usar crédito de qualquer cliente (configurável em Configurações)'
                : 'Cada saída consome apenas o saldo do cliente selecionado'}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {clientBalances.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum crédito vinculado a clientes ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-2 font-medium">Cliente</th>
                    <th className="px-2 py-2 font-medium text-right">Passado</th>
                    <th className="px-2 py-2 font-medium text-right">Utilizado</th>
                    <th className="px-2 py-2 font-medium text-right">Saldo</th>
                    {canWrite ? <th className="px-2 py-2 font-medium text-right">Ações</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {clientBalances.map((row) => (
                    <tr key={row.client_id} className="border-b border-white/5">
                      <td className="px-2 py-2 font-medium">{row.client_name}</td>
                      <td className="px-2 py-2 text-right text-green-400">{money(row.total_entrada)}</td>
                      <td className="px-2 py-2 text-right text-red-400">{money(row.total_saida)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-gold">{money(row.balance)}</td>
                      {canWrite ? (
                        <td className="px-2 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFilterClient(row.client_id)}
                            >
                              Ver extrato
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCreate('saida', row.client_id)}
                            >
                              Saída
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
              ...(!filterClient ? [{
                key: 'client',
                header: 'Cliente',
                render: (r: LumberCreditMovement) => r.client?.name ?? '—',
              }] : []),
              {
                key: 'integration',
                header: 'Integração',
                render: (r) => {
                  const purchaseNumbers = getLumberCreditPurchaseNumbers(r)
                  if (purchaseNumbers.length === 0) {
                    return r.movement_type === 'saida' ? '—' : null
                  }
                  return (
                    <div className="space-y-0.5">
                      {purchaseNumbers.map((number) => (
                        <Link key={number} to="/compras" className="block text-sm text-gold hover:underline">
                          Compra #{number}
                        </Link>
                      ))}
                    </div>
                  )
                },
              },
              {
                key: 'amount',
                header: 'Valor',
                render: (r) => (
                  <span className={r.movement_type === 'entrada' ? 'text-green-400' : 'text-red-400'}>
                    {r.movement_type === 'entrada' ? '+' : '−'}{money(r.amount)}
                  </span>
                ),
              },
              {
                key: 'balance',
                header: filterClient ? 'Saldo do cliente' : 'Saldo após',
                render: (r) => <span className="font-medium text-gold">{money(r.balanceAfter)}</span>,
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
            allowCrossClient={allowCrossClient}
            clientBalances={clientBalances}
            onSupplierCreated={() => {
              void queryClient.invalidateQueries({ queryKey: ['lookups', 'suppliers'] })
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
