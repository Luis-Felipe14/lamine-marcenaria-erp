import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { DataTable } from '@/components/shared/DataTable'
import type { Column } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { REQUEST_PRIORITIES } from '@/lib/constants'
import { invalidateDashboardMetrics } from '@/lib/invalidate-dashboard'
import { useDepartments } from '@/hooks/useDepartments'
import { createRecord, updateRecord } from '@/services/api'
import { emptyToNull } from '@/lib/supabase-helpers'
import { useAuthStore } from '@/stores/authStore'
import { useInternalRequests } from '@/hooks/useQueries'
import type { InternalRequest } from '@/services/requests.service'

export function RequestsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'media',
    requesting_department_id: '', responsible_department_id: '',
  })
  const userId = useAuthStore((s) => s.user?.id)
  const departments = useDepartments()

  const { data: result, isLoading: loading, isFetching } = useInternalRequests(page)
  const requests = result?.data ?? []
  const totalPages = result?.totalPages ?? 1

  const refreshRequests = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['requests'] }),
      invalidateDashboardMetrics(queryClient),
    ])
  }, [queryClient])

  const priorityVariant = useCallback((p: string) => {
    if (p === 'urgente') return 'danger' as const
    if (p === 'alta') return 'warning' as const
    return 'secondary' as const
  }, [])

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      await updateRecord('internal_requests', id, { status })
      toast.success('Status atualizado')
      await refreshRequests()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar')
    }
  }, [refreshRequests])

  const columns = useMemo<Column<InternalRequest>[]>(() => [
    { key: 'number', header: '#', render: (r) => `#${r.number}` },
    { key: 'title', header: 'Título' },
    { key: 'requesting', header: 'Solicitante', render: (r) => r.requesting_department?.label },
    { key: 'responsible', header: 'Responsável', render: (r) => r.responsible_department?.label },
    {
      key: 'priority',
      header: 'Prioridade',
      render: (r) => (
        <Badge variant={priorityVariant(r.priority)}>
          {REQUEST_PRIORITIES.find((p) => p.value === r.priority)?.label}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Select value={r.status} onValueChange={(v) => void updateStatus(r.id, v)}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ], [priorityVariant, updateStatus])

  const onSubmit = async () => {
    try {
      if (!form.requesting_department_id || !form.responsible_department_id) {
        toast.error('Selecione os setores solicitante e responsável')
        return
      }
      const req = await createRecord('internal_requests', emptyToNull({ ...form, status: 'aberta', requested_by: userId })) as { id: string }
      const { error: histError } = await supabase.from('request_history').insert({ request_id: req.id, user_id: userId, action: 'criada', notes: 'Solicitação aberta' })
      if (histError) throw histError
      toast.success('Solicitação criada!')
      setDialogOpen(false)
      setPage(1)
      await refreshRequests()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  return (
    <PageContent>
      <PageHeader title="Solicitações Internas" description="Comunicação entre setores"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova Solicitação</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Solicitação</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Setor Solicitante</Label>
                    <Select value={form.requesting_department_id} onValueChange={(v) => setForm({ ...form, requesting_department_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Setor Responsável</Label>
                    <Select value={form.responsible_department_id} onValueChange={(v) => setForm({ ...form, responsible_department_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REQUEST_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button onClick={() => void onSubmit()} className="w-full">Enviar</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <TableToolbar panel />

      <PageDataZone>
        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        {isFetching && !loading && (
          <p className="mt-2 text-center text-[10px] text-gray-600">Atualizando...</p>
        )}
      </PageDataZone>
    </PageContent>
  )
}
