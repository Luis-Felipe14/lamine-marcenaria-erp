import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { MaskedInput } from '@/components/ui/masked-input'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { SELECT_NONE } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import { invalidateDashboardMetrics } from '@/lib/invalidate-dashboard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useConfirm } from '@/hooks/useConfirm'
import { useClients, useLookupArchitects } from '@/hooks/useQueries'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

const schema = z.object({
  name: z.string().min(2),
  document: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  architect_id: z.string().optional(),
  notes: z.string().optional(),
})

function toSelectValue(value?: string | null) {
  return value && value.length > 0 ? value : SELECT_NONE
}

function fromSelectValue(value: string) {
  return value === SELECT_NONE ? '' : value
}

export function ClientsPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebouncedValue(search, 400)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [detail, setDetail] = useState<Client | null>(null)
  const [history, setHistory] = useState<{ leads: unknown[]; budgets: unknown[]; orders: unknown[] }>({ leads: [], budgets: [], orders: [] })
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({ resolver: zodResolver(schema) })

  const { data: result, isLoading: loading, isFetching } = useClients(page, debouncedSearch)
  const { data: architects = [] } = useLookupArchitects()
  const clients = result?.data ?? []
  const totalPages = result?.totalPages ?? 1

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const openCreate = () => {
    setEditing(null)
    form.reset({
      name: '', document: '', phone: '', whatsapp: '', email: '',
      address_street: '', address_city: '', architect_id: '', notes: '',
    })
    setDialogOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditing(client)
    form.reset({
      name: client.name,
      document: client.document ?? '',
      phone: client.phone ?? '',
      whatsapp: client.whatsapp ?? '',
      email: client.email ?? '',
      address_street: client.address_street ?? '',
      address_city: client.address_city ?? '',
      architect_id: client.architect_id ?? '',
      notes: client.notes ?? '',
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setSubmitting(true)
    try {
      if (editing) {
        await updateRecord('clients', editing.id, {
          ...data,
          architect_id: data.architect_id || null,
        })
        toast.success('Cliente atualizado!')
      } else {
        await createRecord('clients', {
          ...data,
          architect_id: data.architect_id || null,
        })
        toast.success('Cliente cadastrado!')
      }
      setDialogOpen(false)
      setEditing(null)
      form.reset()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        invalidateDashboardMetrics(queryClient),
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (client: Client) => {
    if (!await confirm({
      title: 'Excluir cliente',
      message: `Deseja excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`,
    })) return
    try {
      await softDelete('clients', client.id)
      toast.success('Cliente excluído')
      if (detail?.id === client.id) setDetail(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        invalidateDashboardMetrics(queryClient),
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const viewDetail = async (client: Client) => {
    setDetail(client)
    const [leads, budgets, orders] = await Promise.all([
      supabase.from('leads').select('*').eq('client_id', client.id).is('deleted_at', null),
      supabase.from('budgets').select('id, number, project_name, status, total_value, date').eq('client_id', client.id).is('deleted_at', null),
      supabase.from('orders').select('id, number, status, value, date').eq('client_id', client.id).is('deleted_at', null),
    ])
    setHistory({ leads: leads.data ?? [], budgets: budgets.data ?? [], orders: orders.data ?? [] })
  }

  return (
    <PageContent>
      <PageHeader
        title="Clientes"
        description="Cadastro e histórico completo"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                <DialogDescription>
                  {editing ? 'Atualize os dados do cliente' : 'Preencha os dados para cadastrar'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <FormField label="Nome" required error={form.formState.errors.name?.message}>
                  <Input {...form.register('name')} />
                </FormField>
                <FormField label="CPF/CNPJ" hint="Documento do cliente">
                  <MaskedInput mask="cpfCnpj" value={form.watch('document') ?? ''} onChange={(v) => form.setValue('document', v)} />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Telefone">
                    <MaskedInput mask="phone" value={form.watch('phone') ?? ''} onChange={(v) => form.setValue('phone', v)} />
                  </FormField>
                  <FormField label="WhatsApp">
                    <MaskedInput mask="phone" value={form.watch('whatsapp') ?? ''} onChange={(v) => form.setValue('whatsapp', v)} />
                  </FormField>
                </div>
                <FormField label="E-mail" error={form.formState.errors.email?.message}>
                  <Input type="email" {...form.register('email')} />
                </FormField>
                <FormField label="Endereço">
                  <Input {...form.register('address_street')} />
                </FormField>
                <FormField label="Cidade">
                  <Input {...form.register('address_city')} />
                </FormField>
                <div className="space-y-1.5">
                  <Label>Arquiteto parceiro</Label>
                  <Select
                    value={toSelectValue(form.watch('architect_id'))}
                    onValueChange={(v) => form.setValue('architect_id', fromSelectValue(v))}
                  >
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                      {architects.map((architect) => (
                        <SelectItem key={architect.id} value={architect.id}>{architect.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Observações</label>
                  <Textarea {...form.register('notes')} className="min-h-[80px]" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <TableToolbar
        panel
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Buscar cliente..."
      />

      <PageDataZone>
      <DataTable
        columns={[
          { key: 'name', header: 'Nome', sortable: true },
          { key: 'document', header: 'CPF/CNPJ', sortable: true },
          { key: 'phone', header: 'Telefone', sortable: true },
          { key: 'email', header: 'E-mail', sortable: true },
          { key: 'actions', header: '', sortable: false, render: (row) => (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" onClick={() => viewDetail(row)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          )},
        ]}
        data={clients}
        loading={loading || isFetching}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={viewDetail}
      />
      </PageDataZone>

      {detail && (
        <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detail.name}</DialogTitle>
              <DialogDescription>Histórico de leads, orçamentos e pedidos</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Documento:</span> {detail.document ?? '-'}</div>
              <div><span className="text-gray-500">Telefone:</span> {detail.phone ?? '-'}</div>
              <div><span className="text-gray-500">E-mail:</span> {detail.email ?? '-'}</div>
              <div><span className="text-gray-500">Cadastro:</span> {formatDate(detail.created_at)}</div>
            </div>
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => { openEdit(detail); setDetail(null) }}>
                <Pencil className="h-3 w-3 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(detail)}>
                <Trash2 className="h-3 w-3 mr-1" /> Excluir
              </Button>
            </div>
            <h4 className="font-medium text-gold mb-2">Leads ({history.leads.length})</h4>
            <h4 className="font-medium text-gold mb-2 mt-4">Orçamentos ({history.budgets.length})</h4>
            {(history.budgets as { number: number; project_name: string; status: string; total_value: number }[]).map((b) => (
              <div key={b.number} className="text-sm p-2 bg-surface-elevated rounded mb-1">#{b.number} {b.project_name} - {b.status}</div>
            ))}
            <h4 className="font-medium text-gold mb-2 mt-4">Pedidos ({history.orders.length})</h4>
            {(history.orders as { number: number; status: string; value: number }[]).map((o) => (
              <div key={o.number} className="text-sm p-2 bg-surface-elevated rounded mb-1">#{o.number} - {o.status}</div>
            ))}
          </DialogContent>
        </Dialog>
      )}
      <ConfirmDialog {...dialogProps} />
    </PageContent>
  )
}
