import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, RefreshCw, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { BirthdayBoard } from '@/components/employees/BirthdayBoard'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaskedInput } from '@/components/ui/masked-input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { onlyDigits } from '@/lib/masks'
import { useDepartments } from '@/hooks/useDepartments'
import {
  getSuggestedRoleForDepartment,
  getSuggestedRoleLabel,
  shouldOfferLoginByDefault,
  canCreateEmployeeLogin,
} from '@/lib/employee-roles'
import { generateTemporaryPassword } from '@/lib/password'
import { canManageEmployees } from '@/lib/permissions'
import { formatBirthdayDay, formatCpfDisplay, formatCurrency, formatDate } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import {
  displayUsername,
  isValidUsername,
  suggestUsernameFromName,
} from '@/lib/auth-username'
import { provisionEmployeeLogin, syncEmployeeUserProfile, assertRoleExists } from '@/services/users.service'
import { emptyToNull } from '@/lib/supabase-helpers'
import { useEmployees } from '@/hooks/useQueries'
import { useConfirm } from '@/hooks/useConfirm'
import { useAuthStore } from '@/stores/authStore'

interface LinkedUser {
  id: string
  full_name: string
  email: string
  username: string | null
  role?: { name: string; label: string }
}

interface Employee {
  id: string
  name: string
  position: string
  phone: string | null
  cpf: string | null
  birth_date: string | null
  salary: number | null
  admission_date: string | null
  is_active: boolean
  department_id: string | null
  user_id: string | null
  department?: { label: string; name: string }
  user?: LinkedUser | LinkedUser[] | null
}

interface CreatedCredentials {
  name: string
  username: string
  password: string
  roleLabel: string
}

const emptyForm = () => ({
  name: '',
  position: '',
  department_id: '',
  create_login: false,
  login_username: '',
  login_password: '',
  phone: '',
  cpf: '',
  birth_date: '',
  salary: 0,
  admission_date: '',
})

function resolveUser(user: Employee['user']): LinkedUser | null {
  if (!user) return null
  return Array.isArray(user) ? user[0] ?? null : user
}

export function EmployeesPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const currentRole = useAuthStore((s) => s.profile?.role?.name)
  const canEdit = canManageEmployees(currentRole)

  const [page, setPage] = useState(1)
  const { data: result, isLoading: loading, isFetching } = useEmployees(page)
  const employeesList = (result?.data ?? []) as Employee[]
  const totalPages = result?.totalPages ?? 1
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const departments = useDepartments()

  const selectedDepartment = departments.find((d) => d.id === form.department_id)
  const suggestedRole = getSuggestedRoleForDepartment(selectedDepartment?.name)
  const suggestedRoleLabel = getSuggestedRoleLabel(selectedDepartment?.name)
  const canOfferLogin = canCreateEmployeeLogin(selectedDepartment?.name)
  const hasExistingLogin = Boolean(editing?.user_id)

  const load = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['employees'] }),
      queryClient.invalidateQueries({ queryKey: ['employees', 'birthdays'] }),
    ])
  }

  const refresh = load

  const handleDepartmentChange = (departmentId: string) => {
    const department = departments.find((d) => d.id === departmentId)
    const offerLogin = shouldOfferLoginByDefault(department?.name)
    setForm((current) => ({
      ...current,
      department_id: departmentId,
      create_login: hasExistingLogin ? current.create_login : offerLogin,
      login_password: hasExistingLogin
        ? current.login_password
        : (offerLogin && !current.login_password ? generateTemporaryPassword() : current.login_password),
    }))
  }

  const handleCreateLoginToggle = (create_login: boolean) => {
    setForm((current) => ({
      ...current,
      create_login,
      login_password: create_login && !current.login_password
        ? generateTemporaryPassword()
        : current.login_password,
    }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (employee: Employee) => {
    const linkedUser = resolveUser(employee.user)
    const offerLogin = !employee.user_id && shouldOfferLoginByDefault(employee.department?.name)
    setEditing(employee)
    setForm({
      name: employee.name,
      position: employee.position,
      department_id: employee.department_id ?? '',
      create_login: offerLogin,
      login_username: linkedUser ? displayUsername(linkedUser.username, linkedUser.email) : '',
      login_password: offerLogin ? generateTemporaryPassword() : '',
      phone: employee.phone ?? '',
      cpf: employee.cpf ? formatCpfDisplay(employee.cpf) : '',
      birth_date: employee.birth_date ?? '',
      salary: employee.salary ?? 0,
      admission_date: employee.admission_date ?? '',
    })
    setDialogOpen(true)
  }

  const syncRoleForUser = async (userId: string, departmentName: string | undefined, fullName: string) => {
    const roleName = getSuggestedRoleForDepartment(departmentName)
    if (!roleName) return

    const { data: roleRow } = await supabase
      .from('roles')
      .select('id, label')
      .eq('name', roleName)
      .single()

    if (!roleRow) return

    await syncEmployeeUserProfile(userId, fullName, roleRow.id)
    toast.success(`Perfil atualizado para ${roleRow.label}`)
  }

  const onSubmit = async () => {
    if (!form.name.trim() || !form.position.trim()) {
      toast.error('Informe nome e cargo')
      return
    }
    if (!form.department_id) {
      toast.error('Selecione o setor')
      return
    }

    const shouldCreateLogin = form.create_login && !hasExistingLogin
    if (shouldCreateLogin) {
      if (!form.login_username.trim()) {
        toast.error('Informe o usuário de acesso')
        return
      }
      if (!isValidUsername(form.login_username)) {
        toast.error('Usuário inválido (mín. 2 caracteres)')
        return
      }
      if (form.login_password.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres')
        return
      }
      if (!suggestedRole) {
        toast.error('Setor sem perfil de acesso configurado')
        return
      }
      try {
        await assertRoleExists(suggestedRole)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao validar perfil')
        return
      }
    }

    setSubmitting(true)
    try {
      let userId = editing?.user_id ?? null
      let credentials: CreatedCredentials | null = null

      if (shouldCreateLogin) {
        const login = await provisionEmployeeLogin({
          username: form.login_username.trim(),
          password: form.login_password,
          full_name: form.name.trim(),
          role_name: suggestedRole!,
        })
        userId = login.user_id
        credentials = {
          name: form.name.trim(),
          username: login.username,
          password: form.login_password,
          roleLabel: suggestedRoleLabel ?? suggestedRole!,
        }
      }

      const cpfDigits = onlyDigits(form.cpf)
      const payload = emptyToNull({
        name: form.name.trim(),
        position: form.position.trim(),
        department_id: form.department_id,
        user_id: userId,
        phone: form.phone,
        cpf: cpfDigits || null,
        salary: form.salary || null,
        birth_date: form.birth_date || null,
        admission_date: form.admission_date || null,
      })

      if (editing) {
        await updateRecord('employees', editing.id, payload)
        if (userId) {
          await syncRoleForUser(userId, selectedDepartment?.name, form.name.trim())
        }
        toast.success('Funcionário atualizado!')
      } else {
        await createRecord('employees', { ...payload, is_active: true })
        toast.success(
          credentials
            ? 'Funcionário cadastrado com acesso ao sistema!'
            : 'Funcionário cadastrado!',
        )
      }

      setDialogOpen(false)
      setEditing(null)
      setForm(emptyForm())
      if (credentials) setCreatedCredentials(credentials)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (employee: Employee) => {
    if (!await confirm({
      title: 'Excluir funcionário',
      message: `Deseja excluir o funcionário "${employee.name}"? Esta ação não pode ser desfeita.`,
    })) return
    try {
      await softDelete('employees', employee.id)
      toast.success('Funcionário excluído')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const copyToClipboard = async (value: string, field: 'username' | 'password') => {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    toast.success('Copiado!')
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <PageContent>
      <PageHeader title="Funcionários" description="Cadastro de colaboradores e aniversariantes"
        actions={canEdit ? (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo Funcionário</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? 'Atualize os dados do colaborador. O perfil de acesso segue o setor.'
                    : 'Cadastre colaboradores operacionais. Proprietários são cadastrados em Configurações → Proprietários.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => {
                  const name = e.target.value
                  setForm((current) => ({
                    ...current,
                    name,
                    login_username: current.create_login && !hasExistingLogin && !current.login_username.trim()
                      ? suggestUsernameFromName(name)
                      : current.login_username,
                  }))
                }} /></div>
                <div><Label>Cargo</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Ex: Marceneiro, Secretária" /></div>
                <div>
                  <Label>Setor</Label>
                  <Select value={form.department_id} onValueChange={handleDepartmentChange}>
                    <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
                    <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {suggestedRoleLabel && (
                    <p className="mt-1 text-xs text-gray-500">
                      Perfil de acesso: <span className="text-gold">{suggestedRoleLabel}</span>
                    </p>
                  )}
                </div>

                {hasExistingLogin ? (
                  <div className="rounded-lg border border-border/60 bg-surface-elevated px-4 py-3">
                    <p className="text-sm font-medium">Acesso ao sistema</p>
                    <p className="mt-1 text-sm text-gray-400 font-medium">{form.login_username}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Login já criado. Ao alterar o setor, o perfil será atualizado automaticamente.
                    </p>
                  </div>
                ) : canOfferLogin ? (
                  <>
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-surface-elevated px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="create-login" className="text-sm font-medium">Liberar acesso ao sistema</Label>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Cria login e perfil automaticamente conforme o setor
                        </p>
                      </div>
                      <Switch
                        id="create-login"
                        checked={form.create_login}
                        onCheckedChange={handleCreateLoginToggle}
                      />
                    </div>
                    {form.create_login && (
                      <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                        <div>
                          <Label>Usuário de acesso</Label>
                          <Input
                            placeholder="Ex: ANTONIO E"
                            value={form.login_username}
                            onChange={(e) => setForm({ ...form, login_username: e.target.value.toUpperCase() })}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Será usado para entrar no ERP (não precisa ser e-mail real).
                          </p>
                        </div>
                        <div>
                          <Label>Senha inicial</Label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={form.login_password}
                              onChange={(e) => setForm({ ...form, login_password: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Gerar nova senha"
                              onClick={() => setForm({ ...form, login_password: generateTemporaryPassword() })}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Anote a senha para repassar ao funcionário. Mínimo de 6 caracteres.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="rounded-lg border border-border/60 bg-surface-elevated px-4 py-3 text-xs text-gray-500">
                    Este setor não recebe login pelo cadastro de funcionários. Para acesso de proprietário, use{' '}
                    <span className="text-gold">Configurações → Proprietários</span>.
                  </p>
                )}

                <div><Label>CPF</Label><MaskedInput mask="cpfCnpj" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} placeholder="000.000.000-00" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Telefone</Label><MaskedInput mask="phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></div>
                  <div><Label>Salário</Label><CurrencyInput value={form.salary} onChange={(salary) => setForm({ ...form, salary })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Data de Nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
                  <div><Label>Data Admissão</Label><Input type="date" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} /></div>
                </div>
                <Button onClick={onSubmit} className="w-full" disabled={submitting}>
                  {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar funcionário'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />

      <BirthdayBoard />

      <TableToolbar panel />

      <PageDataZone>
      <DataTable
        columns={[
          { key: 'name', header: 'Nome' },
          { key: 'position', header: 'Cargo' },
          { key: 'department', header: 'Setor', render: (r) => r.department?.label ?? '-' },
          {
            key: 'user',
            header: 'Login',
            render: (r) => {
              const user = resolveUser(r.user)
              if (!user) return <span className="text-gray-500">Sem acesso</span>
              return (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{displayUsername(user.username, user.email)}</p>
                  {user.role?.label && <p className="text-xs text-gray-500">{user.role.label}</p>}
                </div>
              )
            },
          },
          { key: 'cpf', header: 'CPF', render: (r) => formatCpfDisplay(r.cpf) },
          { key: 'birth_date', header: 'Aniversário', render: (r) => formatBirthdayDay(r.birth_date) },
          { key: 'phone', header: 'Telefone' },
          { key: 'salary', header: 'Salário', render: (r) => r.salary ? formatCurrency(r.salary) : '-' },
          { key: 'admission_date', header: 'Admissão', render: (r) => formatDate(r.admission_date) },
          { key: 'is_active', header: 'Status', render: (r) => <Badge variant={r.is_active ? 'success' : 'secondary'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge> },
          ...(canEdit ? [{
            key: 'actions',
            header: '',
            render: (r: Employee) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            ),
          }] : []),
        ]}
        data={employeesList}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      {isFetching && !loading && (
        <p className="mt-2 text-center text-[10px] text-gray-600">Atualizando...</p>
      )}
      </PageDataZone>

      <Dialog open={Boolean(createdCredentials)} onOpenChange={(open) => { if (!open) setCreatedCredentials(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso criado com sucesso</DialogTitle>
            <DialogDescription>
              Repasse estas informações para {createdCredentials?.name}. Esta senha não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-3">
              <div className="rounded-lg bg-surface-elevated p-3">
                <p className="text-xs text-gray-500">Perfil</p>
                <p className="font-medium">{createdCredentials.roleLabel}</p>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-elevated p-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Usuário</p>
                  <p className="truncate font-medium">{createdCredentials.username}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => void copyToClipboard(createdCredentials.username, 'username')}>
                  {copiedField === 'username' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-elevated p-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Senha inicial</p>
                  <p className="font-mono font-medium">{createdCredentials.password}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => void copyToClipboard(createdCredentials.password, 'password')}>
                  {copiedField === 'password' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button className="w-full" onClick={() => setCreatedCredentials(null)}>Entendi</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </PageContent>
  )
}
