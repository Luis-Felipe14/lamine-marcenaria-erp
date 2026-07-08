import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Megaphone, Calendar, TrendingUp, Clock, AlertCircle, Trash2 } from 'lucide-react'
import { parseISO } from 'date-fns'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CAMPAIGN_CHANNELS, PAYMENT_STATUSES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import { invalidateDashboardMetrics } from '@/lib/invalidate-dashboard'
import { computeInvestmentStats, type MarketingInvestment } from '@/services/marketing.service'
import { useIntersectionVisible } from '@/hooks/useIntersectionVisible'
import { useConfirm } from '@/hooks/useConfirm'
import { useMarketingInvestments, useMarketingInvestmentsPaginated } from '@/hooks/useQueries'

const MarketingCharts = lazy(() =>
  import('@/modules/marketing/MarketingCharts').then((m) => ({ default: m.MarketingCharts }))
)

const CHART_COLORS = ['#c9a227', '#e4c65a', '#9a7b1a', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

const emptyForm = {
  name: '',
  provider_name: '',
  channel: 'instagram',
  investment: 0,
  start_date: '',
  end_date: '',
  payment_status: 'pago',
  notes: '',
  is_active: true,
}

type FormState = typeof emptyForm

function channelLabel(value: string) {
  return CAMPAIGN_CHANNELS.find((c) => c.value === value)?.label ?? value
}

function paymentLabel(value: string) {
  return PAYMENT_STATUSES.find((p) => p.value === value)?.label ?? value
}

export function MarketingPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const { ref: chartsRef, visible: chartsVisible } = useIntersectionVisible('200px')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingInvestment | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data: investments = [], isLoading: statsLoading } = useMarketingInvestments()
  const { data: listResult, isLoading: tableLoading, isFetching } = useMarketingInvestmentsPaginated(
    filterYear,
    filterMonth,
    page
  )

  const tableRows = listResult?.data ?? []
  const totalPages = listResult?.totalPages ?? 1
  const loading = statsLoading || (tableLoading && !listResult)

  const stats = useMemo(() => computeInvestmentStats(investments), [investments])

  const yearOptions = useMemo(() => {
    const years = new Set(investments.map((i) => parseISO(i.start_date).getFullYear()))
    years.add(new Date().getFullYear())
    years.add(filterYear)
    return [...years].sort((a, b) => b - a)
  }, [investments, filterYear])

  useEffect(() => {
    setPage(1)
  }, [filterYear, filterMonth])

  const refreshMarketing = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['marketing'] }),
      invalidateDashboardMetrics(queryClient),
    ])
  }, [queryClient])

  const handleDelete = useCallback(async (row: MarketingInvestment) => {
    if (!await confirm({
      title: 'Excluir investimento',
      message: `Deseja excluir o investimento "${row.name}" (${formatCurrency(row.investment)})? Esta ação não pode ser desfeita.`,
    })) return

    try {
      await softDelete('campaigns', row.id)
      toast.success('Investimento excluído')
      await refreshMarketing()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }, [confirm, refreshMarketing])

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((row: MarketingInvestment) => {
    setEditing(row)
    setForm({
      name: row.name,
      provider_name: row.provider_name ?? '',
      channel: row.channel,
      investment: Number(row.investment),
      start_date: row.start_date,
      end_date: row.end_date ?? '',
      payment_status: row.payment_status ?? 'pago',
      notes: row.notes ?? '',
      is_active: row.is_active,
    })
    setDialogOpen(true)
  }, [])

  const columns = useMemo<Column<MarketingInvestment>[]>(() => [
    { key: 'name', header: 'Descrição' },
    { key: 'provider_name', header: 'Prestador', render: (r) => r.provider_name || '—' },
    { key: 'channel', header: 'Canal', render: (r) => channelLabel(r.channel) },
    { key: 'investment', header: 'Valor', render: (r) => formatCurrency(r.investment) },
    { key: 'start_date', header: 'Data', render: (r) => formatDate(r.start_date) },
    {
      key: 'payment_status',
      header: 'Pagamento',
      render: (r) => (
        <Badge variant={r.payment_status === 'pago' ? 'success' : 'warning'}>
          {paymentLabel(r.payment_status)}
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: 'Obs.',
      render: (r) => (
        <span className="max-w-[160px] truncate text-xs text-gray-500" title={r.notes ?? ''}>
          {r.notes || '—'}
        </span>
      ),
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
  ], [openEdit, handleDelete])

  async function onSubmit() {
    if (!form.name.trim() || !form.start_date) {
      toast.error('Preencha descrição e data')
      return
    }
    try {
      const payload = {
        name: form.name.trim(),
        provider_name: form.provider_name.trim() || null,
        channel: form.channel,
        investment: Number(form.investment) || 0,
        start_date: form.start_date,
        end_date: form.end_date || null,
        payment_status: form.payment_status,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      }
      if (editing) {
        await updateRecord('campaigns', editing.id, payload)
        toast.success('Investimento atualizado!')
      } else {
        await createRecord('campaigns', payload)
        toast.success('Investimento registrado!')
      }
      setDialogOpen(false)
      await refreshMarketing()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investimentos em Marketing"
        description="Controle de gastos com prestadores externos e canais de divulgação"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Novo investimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar investimento' : 'Novo investimento'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex.: Gestão Instagram — março"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Prestador externo</Label>
                  <Input
                    placeholder="Nome da pessoa ou empresa"
                    value={form.provider_name}
                    onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Canal</Label>
                    <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_CHANNELS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <CurrencyInput
                      value={form.investment}
                      onChange={(investment) => setForm({ ...form, investment })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Data de referência</Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status do pagamento</Label>
                    <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Período de vigência (opcional)</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Detalhes do serviço, combinados, relatórios solicitados..."
                    className="min-h-[100px]"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <Button onClick={() => void onSubmit()} className="w-full">
                  {editing ? 'Salvar alterações' : 'Registrar investimento'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Investido no mês" value={formatCurrency(stats.monthTotal)} icon={Calendar} highlight />
        <StatCard title="Investido no ano" value={formatCurrency(stats.yearTotal)} icon={TrendingUp} />
        <StatCard
          title="Média mensal (6 meses)"
          value={formatCurrency(stats.monthlyAverage)}
          icon={Megaphone}
        />
        <StatCard
          title="Pendente de pagamento"
          value={formatCurrency(stats.pendingTotal)}
          icon={AlertCircle}
          highlight={stats.pendingTotal > 0}
          subtitle={stats.lastEntry ? `Último: ${stats.lastEntry.name}` : 'Nenhum lançamento'}
        />
      </div>

      <div ref={chartsRef} className="grid gap-5 xl:grid-cols-2 min-h-[280px]">
        {!chartsVisible ? (
          <>
            <Skeleton className="h-[320px] rounded-xl" />
            <Skeleton className="h-[320px] rounded-xl" />
          </>
        ) : (
          <Suspense
            fallback={
              <>
                <Skeleton className="h-[320px] rounded-xl" />
                <Skeleton className="h-[320px] rounded-xl" />
              </>
            }
          >
            <MarketingCharts stats={stats} channelLabel={channelLabel} colors={CHART_COLORS} />
          </Suspense>
        )}
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold" />
            Lançamentos
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
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
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tableRows}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
          {isFetching && !tableLoading && (
            <p className="mt-2 text-center text-[10px] text-gray-600">Atualizando...</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
