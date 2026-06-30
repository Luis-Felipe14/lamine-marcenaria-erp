import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileDown, FileSpreadsheet, Plus, Trash2, Users, DollarSign, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { StatCard } from '@/components/shared/StatCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RECEIPT_TYPES, SELECT_NONE, getReceiptTypeLabel } from '@/lib/constants'
import { canManagePayroll } from '@/lib/permissions'
import { exportEmployeeReceiptPDF, exportToExcel, exportToPDF } from '@/lib/export'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useConfirm } from '@/hooks/useConfirm'
import { usePayrollMonth } from '@/hooks/useQueries'
import { useAuthStore } from '@/stores/authStore'
import {
  createEmployeeReceipt,
  createPayrollTimeEntry,
  deletePayrollTimeEntry,
  softDeleteEmployeeReceipt,
  type EmployeeReceipt,
  type PayrollTimeEntry,
} from '@/services/payroll.service'
import type { ReceiptType } from '@/types'

const currentMonth = () => format(new Date(), 'yyyy-MM')

const emptyTimeForm = () => ({
  employee_id: '',
  hours: 0,
  entry_date: format(new Date(), 'yyyy-MM-dd'),
  description: '',
})

const emptyReceiptForm = () => ({
  employee_id: '',
  amount: 0,
  receipt_date: format(new Date(), 'yyyy-MM-dd'),
  receipt_type: 'recibo' as ReceiptType,
  description: '',
})

export function PayrollPage() {
  const queryClient = useQueryClient()
  const currentRole = useAuthStore((s) => s.profile?.role?.name)
  const userId = useAuthStore((s) => s.user?.id)
  const canEdit = canManagePayroll(currentRole)
  const { confirm, dialogProps } = useConfirm()

  const [referenceMonth, setReferenceMonth] = useState(currentMonth)
  const { data: payrollData, isLoading: loading } = usePayrollMonth(referenceMonth)
  const summary = payrollData?.summary ?? []
  const timeEntries = payrollData?.timeEntries ?? []
  const receipts = payrollData?.receipts ?? []
  const employees = payrollData?.employees ?? []

  const [timeDialogOpen, setTimeDialogOpen] = useState(false)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [timeForm, setTimeForm] = useState(emptyTimeForm)
  const [receiptForm, setReceiptForm] = useState(emptyReceiptForm)
  const [submitting, setSubmitting] = useState(false)
  const [hoursSearch, setHoursSearch] = useState('')
  const [hoursEmployeeFilter, setHoursEmployeeFilter] = useState('')
  const [exportingReceiptId, setExportingReceiptId] = useState<string | null>(null)

  const monthLabel = useMemo(
    () => format(new Date(`${referenceMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR }),
    [referenceMonth],
  )

  const totals = useMemo(() => ({
    overtimeHours: summary.reduce((sum, row) => sum + row.overtimeHours, 0),
    receiptsTotal: summary.reduce((sum, row) => sum + row.receiptsTotal, 0),
    activeEmployees: summary.filter((row) => row.employee.is_active).length,
  }), [summary])

  const refreshPayroll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['payroll'] })
  }, [queryClient])

  useEffect(() => {
    setHoursSearch('')
    setHoursEmployeeFilter('')
  }, [referenceMonth])

  const exportSummary = async (type: 'pdf' | 'excel') => {
    const headers = ['Funcionário', 'Cargo', 'Horas extras', 'Recibos/adiant.', 'Salário ref.']
    const rows = summary.map((row) => [
      row.employee.name,
      row.employee.position,
      row.overtimeHours.toFixed(2),
      formatCurrency(row.receiptsTotal),
      row.employee.salary ? formatCurrency(row.employee.salary) : '—',
    ])
    const title = `Folha — ${monthLabel}`
    try {
      if (type === 'pdf') await exportToPDF(title, headers, rows)
      else await exportToExcel(title, headers, rows)
      toast.success('Relatório exportado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar')
    }
  }

  const saveTimeEntry = async () => {
    if (!timeForm.employee_id) {
      toast.error('Selecione o funcionário')
      return
    }
    if (timeForm.hours <= 0) {
      toast.error('Informe as horas')
      return
    }
    setSubmitting(true)
    try {
      await createPayrollTimeEntry({
        employee_id: timeForm.employee_id,
        hours: timeForm.hours,
        entry_date: timeForm.entry_date,
        entry_type: 'hora_extra',
        description: timeForm.description,
      })
      toast.success('Horas extras registradas!')
      setTimeDialogOpen(false)
      setTimeForm(emptyTimeForm())
      await refreshPayroll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar horas')
    } finally {
      setSubmitting(false)
    }
  }

  const saveReceipt = async () => {
    if (!receiptForm.employee_id) {
      toast.error('Selecione o funcionário')
      return
    }
    if (receiptForm.amount <= 0) {
      toast.error('Informe o valor')
      return
    }
    setSubmitting(true)
    try {
      await createEmployeeReceipt({
        employee_id: receiptForm.employee_id,
        amount: receiptForm.amount,
        receipt_date: receiptForm.receipt_date,
        reference_month: referenceMonth,
        receipt_type: receiptForm.receipt_type,
        description: receiptForm.description,
        created_by: userId,
      })
      toast.success('Recibo registrado!')
      setReceiptDialogOpen(false)
      setReceiptForm(emptyReceiptForm())
      await refreshPayroll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar recibo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTimeEntry = async (entry: PayrollTimeEntry) => {
    const ok = await confirm({
      title: 'Excluir lançamento de horas?',
      message: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
    })
    if (!ok) return
    try {
      await deletePayrollTimeEntry(entry.id)
      toast.success('Lançamento removido')
      await refreshPayroll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const handleExportReceipt = async (receipt: EmployeeReceipt) => {
    setExportingReceiptId(receipt.id)
    try {
      await exportEmployeeReceiptPDF({
        employee_name: receipt.employee?.name ?? 'Colaborador',
        employee_position: receipt.employee?.position ?? '—',
        amount: receipt.amount,
        receipt_date: receipt.receipt_date,
        receipt_type_label: getReceiptTypeLabel(receipt.receipt_type),
        reference_month_label: monthLabel,
        description: receipt.description,
      })
      toast.success('Recibo exportado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar recibo')
    } finally {
      setExportingReceiptId(null)
    }
  }

  const handleDeleteReceipt = async (receipt: EmployeeReceipt) => {
    const ok = await confirm({
      title: 'Excluir recibo?',
      message: `${receipt.employee?.name ?? 'Funcionário'} — ${formatCurrency(receipt.amount)}`,
      confirmLabel: 'Excluir',
    })
    if (!ok) return
    try {
      await softDeleteEmployeeReceipt(receipt.id)
      toast.success('Recibo removido')
      await refreshPayroll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const summaryRows = useMemo(
    () => summary.map((row) => ({ ...row, id: row.employee.id })),
    [summary],
  )

  const overtimeByEmployee = useMemo(
    () => [...summary]
      .filter((row) => row.employee.is_active || row.overtimeHours > 0)
      .sort((a, b) => b.overtimeHours - a.overtimeHours || a.employee.name.localeCompare(b.employee.name)),
    [summary],
  )

  const filteredTimeEntries = useMemo(() => {
    const search = hoursSearch.trim().toLowerCase()
    return timeEntries.filter((entry) => {
      if (hoursEmployeeFilter && entry.employee_id !== hoursEmployeeFilter) return false
      if (!search) return true
      const haystack = [
        entry.employee?.name,
        entry.employee?.position,
        entry.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [timeEntries, hoursSearch, hoursEmployeeFilter])

  return (
    <div>
      <PageHeader
        title="Folha e Recibos"
        description="Conferência mensal de horas e pagamentos aos funcionários"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={() => void exportSummary('pdf')}>
              <FileDown className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportSummary('excel')}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Horas extras"
          value={`${totals.overtimeHours.toFixed(1)} h`}
          icon={Timer}
          subtitle="Registradas manualmente na folha"
        />
        <StatCard title="Recibos no mês" value={formatCurrency(totals.receiptsTotal)} icon={DollarSign} />
        <StatCard title="Funcionários ativos" value={String(totals.activeEmployees)} icon={Users} />
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumo — {monthLabel}</TabsTrigger>
          <TabsTrigger value="hours">Horas</TabsTrigger>
          <TabsTrigger value="receipts">Recibos</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-3">
          <DataTable
            loading={loading}
            data={summaryRows}
            columns={[
              { key: 'name', header: 'Funcionário', render: (r) => r.employee.name },
              { key: 'position', header: 'Cargo', render: (r) => r.employee.position },
              {
                key: 'overtime',
                header: 'Horas extras',
                render: (r) => (
                  <span className={r.overtimeHours > 0 ? 'text-gold font-medium' : ''}>
                    {r.overtimeHours.toFixed(1)} h
                  </span>
                ),
              },
              {
                key: 'receipts',
                header: 'Recibos',
                render: (r) => formatCurrency(r.receiptsTotal),
              },
              {
                key: 'salary',
                header: 'Salário ref.',
                render: (r) => (r.employee.salary ? formatCurrency(r.employee.salary) : '—'),
              },
            ]}
          />
          {!loading && summaryRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3 text-sm">
              <span className="text-gray-400">Totais do mês:</span>
              <span>Horas extras <strong className="text-gold">{totals.overtimeHours.toFixed(1)} h</strong></span>
              <span>Recibos <strong className="text-white">{formatCurrency(totals.receiptsTotal)}</strong></span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="hours" className="mt-4 space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gold/80">
              Totalizador — horas extras por funcionário ({monthLabel})
            </p>
            {loading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : overtimeByEmployee.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum funcionário cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {overtimeByEmployee.map((row) => (
                  <div
                    key={row.employee.id}
                    className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{row.employee.name}</p>
                      <p className="text-xs text-gray-500">{row.employee.position}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${row.overtimeHours > 0 ? 'text-gold' : 'text-gray-500'}`}>
                      {row.overtimeHours.toFixed(1)} h
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-gold/20 pt-3">
                  <span className="text-sm font-medium text-gray-400">Total geral</span>
                  <span className="text-sm font-bold tabular-nums text-gold">{totals.overtimeHours.toFixed(1)} h</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TableToolbar
              search={hoursSearch}
              onSearchChange={setHoursSearch}
              searchPlaceholder="Buscar funcionário ou descrição..."
              className="mb-0 flex-1"
            >
              <Select
                value={hoursEmployeeFilter || SELECT_NONE}
                onValueChange={(v) => setHoursEmployeeFilter(v === SELECT_NONE ? '' : v)}
              >
                <SelectTrigger className="h-9 w-full sm:w-48">
                  <SelectValue placeholder="Funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Todos os funcionários</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableToolbar>
            {canEdit && (
              <Button className="shrink-0" onClick={() => setTimeDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Registrar horas extras
              </Button>
            )}
          </div>
          <DataTable
            loading={loading}
            data={filteredTimeEntries}
            virtualize
            columns={[
              { key: 'date', header: 'Data', render: (r) => formatDate(r.entry_date) },
              { key: 'employee', header: 'Funcionário', render: (r) => r.employee?.name ?? '—' },
              { key: 'hours', header: 'Horas', render: (r) => `${Number(r.hours).toFixed(1)} h` },
              { key: 'description', header: 'Descrição', render: (r) => r.description ?? '—' },
              {
                key: 'actions',
                header: '',
                render: (r) => canEdit ? (
                  <Button variant="ghost" size="sm" onClick={() => void handleDeleteTimeEntry(r)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                ) : null,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="receipts" className="mt-4 space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={() => setReceiptDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Novo recibo
              </Button>
            </div>
          )}
          <DataTable
            loading={loading}
            data={receipts}
            columns={[
              { key: 'date', header: 'Data', render: (r) => formatDate(r.receipt_date) },
              { key: 'employee', header: 'Funcionário', render: (r) => r.employee?.name ?? '—' },
              {
                key: 'type',
                header: 'Tipo',
                render: (r) => getReceiptTypeLabel(r.receipt_type),
              },
              { key: 'amount', header: 'Valor', render: (r) => formatCurrency(r.amount) },
              { key: 'description', header: 'Descrição', render: (r) => r.description ?? '—' },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Exportar recibo PDF"
                      disabled={exportingReceiptId === r.id}
                      onClick={() => void handleExportReceipt(r)}
                    >
                      <FileDown className="h-4 w-4 text-gold" />
                    </Button>
                    {canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => void handleDeleteReceipt(r)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar horas extras</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Funcionário</Label>
              <Select value={timeForm.employee_id} onValueChange={(v) => setTimeForm({ ...timeForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} — {e.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={timeForm.entry_date}
                  onChange={(e) => setTimeForm({ ...timeForm, entry_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Horas</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={timeForm.hours || ''}
                  onChange={(e) => setTimeForm({ ...timeForm, hours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={timeForm.description}
                onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <Button className="w-full" disabled={submitting} onClick={() => void saveTimeEntry()}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo recibo / adiantamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Funcionário</Label>
              <Select
                value={receiptForm.employee_id}
                onValueChange={(v) => setReceiptForm({ ...receiptForm, employee_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} — {e.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={receiptForm.receipt_type}
                onValueChange={(v) => setReceiptForm({ ...receiptForm, receipt_type: v as ReceiptType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECEIPT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data do pagamento</Label>
                <Input
                  type="date"
                  value={receiptForm.receipt_date}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receipt_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor</Label>
                <CurrencyInput
                  value={receiptForm.amount}
                  onChange={(v) => setReceiptForm({ ...receiptForm, amount: v })}
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={receiptForm.description}
                onChange={(e) => setReceiptForm({ ...receiptForm, description: e.target.value })}
                placeholder="Ex.: Recibo semana 1, adiantamento salário"
              />
            </div>
            <p className="text-xs text-gray-500">
              Referência do mês: {monthLabel}
            </p>
            <Button className="w-full" disabled={submitting} onClick={() => void saveReceipt()}>
              {submitting ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
