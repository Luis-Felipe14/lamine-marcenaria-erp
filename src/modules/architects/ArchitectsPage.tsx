import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MaskedInput } from '@/components/ui/masked-input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useConfirm } from '@/hooks/useConfirm'
import { hasPermission } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'
import { updateRecord, softDelete } from '@/services/api'
import {
  createArchitect,
  formatArchitectCommission,
  listArchitectsPaginated,
  type Architect,
  type ArchitectCommissionType,
} from '@/services/architects.service'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

const COMMISSION_TYPES: { value: ArchitectCommissionType; label: string }[] = [
  { value: 'percent_sale', label: '% sobre venda' },
  { value: 'fixed', label: 'Valor fixo por projeto' },
]

const emptyForm = () => ({
  name: '',
  phone: '',
  email: '',
  office: '',
  commission_rate: 0,
  commission_type: 'percent_sale' as ArchitectCommissionType,
  bank_info: '',
  notes: '',
  is_active: true,
})

export function ArchitectsPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const canWrite = hasPermission(role, 'clients.*')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [architects, setArchitects] = useState<Architect[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Architect | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadArchitects = async () => {
    setFetching(true)
    try {
      const result = await listArchitectsPaginated(page, debouncedSearch)
      setArchitects(result.data)
      setTotalPages(result.totalPages)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar arquitetos')
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    void loadArchitects()
  }, [page, debouncedSearch])

  const refresh = async () => {
    await loadArchitects()
    await queryClient.invalidateQueries({ queryKey: ['lookups', 'architects'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard', 'commercial'] })
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (architect: Architect) => {
    setEditing(architect)
    setForm({
      name: architect.name,
      phone: architect.phone ?? '',
      email: architect.email ?? '',
      office: architect.office ?? '',
      commission_rate: architect.commission_rate ?? 0,
      commission_type: architect.commission_type,
      bank_info: architect.bank_info ?? '',
      notes: architect.notes ?? '',
      is_active: architect.is_active,
    })
    setDialogOpen(true)
  }

  const onSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do arquiteto')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        office: form.office.trim() || null,
        commission_rate: form.commission_rate > 0 ? form.commission_rate : null,
        commission_type: form.commission_type,
        bank_info: form.bank_info.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      }

      if (editing) {
        await updateRecord('architects', editing.id, payload)
        toast.success('Arquiteto atualizado!')
      } else {
        await createArchitect(payload)
        toast.success('Arquiteto cadastrado!')
      }

      setDialogOpen(false)
      setEditing(null)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar arquiteto')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (architect: Architect) => {
    if (!await confirm({
      title: 'Excluir arquiteto',
      message: `Deseja excluir o arquiteto "${architect.name}"?`,
    })) return

    try {
      await softDelete('architects', architect.id)
      toast.success('Arquiteto excluído')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir arquiteto')
    }
  }

  return (
    <PageContent>
      <PageHeader
        title="Arquitetos"
        description="Parceiros indicadores — comissão pré-cadastrada para integração financeira futura"
        actions={
          canWrite ? (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) setEditing(null)
            }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo arquiteto</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar arquiteto' : 'Novo arquiteto'}</DialogTitle>
                  <DialogDescription>
                    Dados de contato e comissão usados em clientes, leads e rankings comerciais.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Escritório</Label>
                    <Input value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Telefone</Label>
                      <MaskedInput mask="phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Tipo de comissão</Label>
                      <Select
                        value={form.commission_type}
                        onValueChange={(v) => setForm({ ...form, commission_type: v as ArchitectCommissionType })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COMMISSION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{form.commission_type === 'fixed' ? 'Valor fixo' : 'Percentual'}</Label>
                      {form.commission_type === 'fixed' ? (
                        <CurrencyInput
                          value={form.commission_rate}
                          onChange={(commission_rate) => setForm({ ...form, commission_rate })}
                          emptyWhenZero={false}
                        />
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={form.commission_rate || ''}
                          onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) || 0 })}
                          placeholder="Ex: 5"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Dados bancários</Label>
                    <Textarea
                      value={form.bank_info}
                      onChange={(e) => setForm({ ...form, bank_info: e.target.value })}
                      rows={2}
                      placeholder="Banco, agência, conta, PIX..."
                    />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded border-border"
                    />
                    Ativo para novos vínculos
                  </label>
                  <Button onClick={() => void onSubmit()} className="w-full" disabled={submitting}>
                    {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar arquiteto..." />

      <PageDataZone>
        <DataTable
          columns={[
            { key: 'name', header: 'Nome' },
            { key: 'office', header: 'Escritório', render: (r) => r.office || '—' },
            { key: 'phone', header: 'Telefone', render: (r) => r.phone || '—' },
            {
              key: 'commission',
              header: 'Comissão',
              render: (r) => formatArchitectCommission(r),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <Badge variant={r.is_active ? 'success' : 'secondary'}>
                  {r.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              ),
            },
            { key: 'created_at', header: 'Cadastro', render: (r) => formatDate(r.created_at) },
            {
              key: 'actions',
              header: '',
              render: (r) => canWrite ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => void handleDelete(r)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ) : null,
            },
          ]}
          data={architects}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        {fetching && !loading && (
          <p className="mt-2 text-center text-[10px] text-gray-600">Atualizando...</p>
        )}
      </PageDataZone>

      <ConfirmDialog {...dialogProps} />
    </PageContent>
  )
}
