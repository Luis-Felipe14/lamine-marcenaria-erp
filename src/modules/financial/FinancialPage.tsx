import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageContent, PageDataZone, PageKpiZone } from '@/components/shared/PageLayout'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { StatCard, StatGrid } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  getFinancialCategoryLabel,
  getPaymentMethodLabel,
  getCashDestinationLabel,
  type CashDestination,
} from '@/lib/constants'
import {
  createEmptyFinancialForm,
  getFinancialFormFields,
  sanitizeFinancialPayload,
  validateFinancialForm,
  type FinancialFormState,
} from '@/lib/financial-form.schema'
import { formatCurrency, formatDate, formatInstallment, getDueUrgency, getDueUrgencyLabel } from '@/lib/utils'
import { invalidateDashboardMetrics } from '@/lib/invalidate-dashboard'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import type { FinancialTransaction } from '@/services/financial.service'
import {
  useFinancialSummary,
  useFinancialSettings,
  useFinancialTransactions,
  useLookupClients,
  useLookupOrders,
  useLookupPurchases,
  useLookupSuppliers,
  useLookupEmployeesPayroll,
} from '@/hooks/useQueries'
import { FinancialTransactionForm } from '@/modules/financial/FinancialTransactionForm'
import { useConfirm } from '@/hooks/useConfirm'
import { useAuthStore } from '@/stores/authStore'
import { normalizeRole } from '@/lib/permissions'

interface Transaction extends FinancialTransaction {}

export function FinancialPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const roleName = useAuthStore((s) => s.profile?.role?.name)
  const [filter, setFilter] = useState<'all' | 'receita' | 'despesa'>('all')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState<FinancialFormState>(createEmptyFinancialForm())
  const [submitting, setSubmitting] = useState(false)

  const { data: txResult, isLoading, isFetching } = useFinancialTransactions(page, filter)
  const { data: summary = { receitas: 0, despesas: 0, aPagar: 0, aReceber: 0 } } = useFinancialSummary()
  const { data: financialSettings } = useFinancialSettings()
  const { data: clients = [] } = useLookupClients()
  const { data: orders = [] } = useLookupOrders()
  const { data: purchases = [] } = useLookupPurchases()
  const { data: suppliers = [] } = useLookupSuppliers()
  const { data: employees = [] } = useLookupEmployeesPayroll()

  const transactions = txResult?.data ?? []
  const totalPages = txResult?.totalPages ?? 1
  const isSecretary = normalizeRole(roleName) === 'secretaria'
  const showFinancialSummary = !isSecretary || Boolean(financialSettings?.secretary_can_view_summary)

  useEffect(() => {
    setPage(1)
  }, [filter])

  const invalidateFinancial = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['financial'] }),
      invalidateDashboardMetrics(queryClient),
    ])
  }

  const openCreate = () => {
    setEditing(null)
    setForm(createEmptyFinancialForm())
    setDialogOpen(true)
  }

  const openEdit = (row: Transaction) => {
    const matchedEmployee = row.employee_id
      ? employees.find((e) => e.id === row.employee_id)
      : employees.find((e) => e.name === row.description)

    setEditing(row)
    setForm({
      type: row.type as 'receita' | 'despesa',
      category: row.category,
      description: row.description,
      amount: Number(row.amount),
      due_date: row.due_date ?? '',
      client_id: row.client_id ?? '',
      order_id: row.order_id ?? '',
      purchase_id: row.purchase_id ?? '',
      employee_id: row.employee_id ?? matchedEmployee?.id ?? '',
      payment_method: row.payment_method ?? '',
      notes: row.notes ?? '',
      supplier_id: row.supplier_id ?? '',
      document_number: row.document_number ?? '',
      installment_number: row.installment_number ?? '',
      installment_total: row.installment_total ?? '',
      cash_destination: (row.cash_destination === 'madeireira' ? 'madeireira' : 'empresa') as CashDestination,
    })
    setDialogOpen(true)
  }

  const onSubmit = async () => {
    const fields = getFinancialFormFields(form, { isEditing: Boolean(editing) })
    const validationError = validateFinancialForm(form, fields)
    if (validationError) {
      toast.error(validationError)
      return
    }

    if (!editing && form.type === 'receita' && form.category === 'sinal') {
      const order = orders.find((o) => o.id === form.order_id)
      if (!order) {
        toast.error('Selecione o pedido para calcular o saldo a receber')
        return
      }
      if (Number(form.amount) > order.value) {
        toast.error('O valor do sinal não pode ser maior que o valor do pedido')
        return
      }
    }

    setSubmitting(true)
    try {
      const selectedEmployee = employees.find((e) => e.id === form.employee_id)
      const payload = sanitizeFinancialPayload(form, selectedEmployee?.name ?? form.description)
      if (editing) {
        await updateRecord('financial_transactions', editing.id, payload)
        toast.success('Lançamento atualizado!')
      } else {
        await createRecord('financial_transactions', { ...payload, is_paid: false })

        let remainingCreated = false
        if (form.type === 'receita' && form.category === 'sinal' && form.order_id) {
          const order = orders.find((o) => o.id === form.order_id)
          if (order) {
            const remaining = Math.round((order.value - Number(form.amount)) * 100) / 100
            if (remaining > 0) {
              await createRecord('financial_transactions', {
                type: 'receita',
                category: 'pedido',
                description: `Saldo restante — Pedido #${order.number}`,
                amount: remaining,
                due_date: form.due_date || null,
                client_id: form.client_id || null,
                order_id: form.order_id,
                payment_method: null,
                notes: 'Gerado automaticamente a partir do lançamento de sinal',
                is_paid: false,
                document_number: null,
                installment_number: null,
                installment_total: null,
                purchase_id: null,
                supplier_id: null,
                employee_id: null,
                cash_destination: 'empresa',
              })
              remainingCreated = true
            }
          }
        }

        toast.success(
          remainingCreated
            ? 'Sinal lançado e saldo restante enviado para A Receber!'
            : 'Lançamento criado!',
        )
      }
      setDialogOpen(false)
      setEditing(null)
      await invalidateFinancial()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  const markPaid = async (id: string) => {
    try {
      await updateRecord('financial_transactions', id, { is_paid: true, paid_date: new Date().toISOString().split('T')[0] })
      toast.success('Pagamento confirmado!')
      await invalidateFinancial()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao confirmar pagamento')
    }
  }

  const handleDelete = async (row: Transaction) => {
    const label = row.employee?.name ?? row.description
    if (!await confirm({
      title: 'Excluir lançamento',
      message: `Deseja excluir este lançamento (${label} — ${formatCurrency(row.amount)})? Esta ação não pode ser desfeita.`,
    })) return

    try {
      await softDelete('financial_transactions', row.id)
      toast.success('Lançamento excluído')
      await invalidateFinancial()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const linkLabel = (row: Transaction) => {
    if (row.type === 'receita') {
      const parts: string[] = []
      if (row.client?.name) parts.push(row.client.name)
      if (row.order?.number) parts.push(`Pedido #${row.order.number}`)
      return parts.length ? parts.join(' · ') : '—'
    }
    const parts: string[] = []
    if (row.category === 'salario' && row.employee?.name) {
      parts.push(row.employee.name)
      if (row.employee.position) parts.push(row.employee.position)
      return parts.join(' · ')
    }
    if (row.supplier?.name) parts.push(row.supplier.name)
    if (row.purchase?.number) {
      const desc = row.purchase.description ? ` — ${row.purchase.description}` : ''
      parts.push(`Compra #${row.purchase.number}${desc}`)
    }
    return parts.length ? parts.join(' · ') : '—'
  }

  return (
    <PageContent>
      <PageHeader
        title="Financeiro"
        description="Fluxo de caixa, contas e DRE"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo Lançamento</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
              </DialogHeader>
              <FinancialTransactionForm
                form={form}
                setForm={setForm}
                onSubmit={() => void onSubmit()}
                submitting={submitting}
                editing={Boolean(editing)}
                clients={clients}
                orders={orders}
                purchases={purchases}
                suppliers={suppliers}
                employees={employees}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {showFinancialSummary && (
        <PageKpiZone label="Resumo financeiro">
          <StatGrid strip>
            <StatCard title="Receitas Pagas" value={formatCurrency(summary.receitas)} icon={TrendingUp} subtitle="Entradas confirmadas" />
            <StatCard title="Despesas Pagas" value={formatCurrency(summary.despesas)} icon={TrendingDown} subtitle="Saídas confirmadas" />
            <StatCard title="A Receber" value={formatCurrency(summary.aReceber)} icon={TrendingUp} subtitle="Pendente de recebimento" />
            <StatCard title="A Pagar" value={formatCurrency(summary.aPagar)} icon={TrendingDown} subtitle="Pendente de pagamento" />
          </StatGrid>
        </PageKpiZone>
      )}

      <TableToolbar panel zoneLabel="Filtros">
        <div className="flex gap-1">
          {(['all', 'receita', 'despesa'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'receita' ? 'Receitas' : 'Despesas'}
            </Button>
          ))}
        </div>
      </TableToolbar>

      <PageDataZone label="Lançamentos">
      <DataTable
        columns={[
          { key: 'type', header: 'Tipo', render: (r) => <Badge variant={r.type === 'receita' ? 'success' : 'danger'}>{r.type === 'receita' ? 'Receita' : 'Despesa'}</Badge> },
          { key: 'description', header: 'Descrição', render: (r) => r.employee?.name ?? r.description },
          { key: 'link', header: 'Vínculo', render: (r) => <span className="text-xs text-gray-400">{linkLabel(r)}</span> },
          { key: 'category', header: 'Categoria', render: (r) => getFinancialCategoryLabel(r.category) },
          { key: 'document_number', header: 'NF', render: (r) => r.document_number || '—' },
          { key: 'installment', header: 'Parcelas', render: (r) => formatInstallment(r.installment_number, r.installment_total) },
          { key: 'payment_method', header: 'Pagamento', render: (r) => getPaymentMethodLabel(r.payment_method) },
          {
            key: 'cash_destination',
            header: 'Destino',
            render: (r) => r.type === 'receita'
              ? getCashDestinationLabel(r.cash_destination)
              : '—',
          },
          { key: 'amount', header: 'Valor', render: (r) => formatCurrency(r.amount) },
          {
            key: 'due_date',
            header: 'Vencimento',
            render: (r) => {
              const urgency = getDueUrgency(r.due_date, r.is_paid)
              const label = getDueUrgencyLabel(urgency, r.due_date)
              return (
                <div className="flex flex-col gap-1">
                  <span className={
                    urgency === 'overdue' || urgency === 'today'
                      ? 'text-red-400'
                      : urgency === 'soon'
                        ? 'text-yellow-400'
                        : undefined
                  }>
                    {formatDate(r.due_date)}
                  </span>
                  {label && (
                    <Badge
                      variant={urgency === 'overdue' || urgency === 'today' ? 'danger' : 'warning'}
                      className="w-fit"
                    >
                      {label}
                    </Badge>
                  )}
                </div>
              )
            },
          },
          {
            key: 'is_paid',
            header: 'Status',
            render: (r) => {
              if (r.is_paid) return <Badge variant="success">Pago</Badge>
              const urgency = getDueUrgency(r.due_date, false)
              return (
                <div className="flex flex-col items-start gap-1">
                  <Button size="sm" variant="outline" onClick={() => markPaid(r.id)}>Confirmar</Button>
                  {urgency === 'overdue' && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-red-400">Em atraso</span>
                  )}
                </div>
              )
            },
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} aria-label="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void handleDelete(r)} aria-label="Excluir">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            ),
          },
        ]}
        data={transactions}
        loading={isLoading || isFetching}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      </PageDataZone>

      <ConfirmDialog {...dialogProps} />
    </PageContent>
  )
}
