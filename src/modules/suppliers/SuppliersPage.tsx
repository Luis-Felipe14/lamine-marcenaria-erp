import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MaskedInput } from '@/components/ui/masked-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useConfirm } from '@/hooks/useConfirm'
import { hasPermission } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'
import { updateRecord, softDelete } from '@/services/api'
import { createSupplier, listSuppliersPaginated, type Supplier } from '@/services/suppliers.service'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

const emptyForm = () => ({
  name: '',
  document: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
})

export function SuppliersPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const canWrite = hasPermission(role, 'purchases.*')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadSuppliers = async () => {
    setFetching(true)
    try {
      const result = await listSuppliersPaginated(page, debouncedSearch)
      setSuppliers(result.data)
      setTotalPages(result.totalPages)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    void loadSuppliers()
  }, [page, debouncedSearch])

  const refresh = async () => {
    await loadSuppliers()
    await queryClient.invalidateQueries({ queryKey: ['lookups', 'suppliers'] })
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      document: supplier.document ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      notes: supplier.notes ?? '',
    })
    setDialogOpen(true)
  }

  const onSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do fornecedor')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        document: form.document.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (editing) {
        await updateRecord('suppliers', editing.id, payload)
        toast.success('Fornecedor atualizado!')
      } else {
        await createSupplier(payload)
        toast.success('Fornecedor cadastrado!')
      }

      setDialogOpen(false)
      setEditing(null)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar fornecedor')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (supplier: Supplier) => {
    if (!await confirm({
      title: 'Excluir fornecedor',
      message: `Deseja excluir o fornecedor "${supplier.name}"?`,
    })) return

    try {
      await softDelete('suppliers', supplier.id)
      toast.success('Fornecedor excluído')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir fornecedor')
    }
  }

  return (
    <PageContent>
      <PageHeader
        title="Fornecedores"
        description="Cadastro de madereiras e fornecedores usados em compras e crédito madereira"
        actions={
          canWrite ? (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) setEditing(null)
            }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo fornecedor</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
                  <DialogDescription>
                    Dados usados nas saídas de crédito madereira e nas compras.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>CNPJ / CPF</Label>
                    <MaskedInput mask="cpfCnpj" value={form.document} onChange={(v) => setForm({ ...form, document: v })} />
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
                  <div>
                    <Label>Endereço</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                  </div>
                  <Button onClick={() => void onSubmit()} className="w-full" disabled={submitting}>
                    {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar fornecedor..." />

      <PageDataZone>
        <DataTable
          columns={[
            { key: 'name', header: 'Nome' },
            { key: 'document', header: 'Documento', render: (r) => r.document || '—' },
            { key: 'phone', header: 'Telefone', render: (r) => r.phone || '—' },
            { key: 'email', header: 'E-mail', render: (r) => r.email || '—' },
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
          data={suppliers}
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
