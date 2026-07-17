import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MaterialCategoriesSection } from '@/components/settings/MaterialCategoriesSection'
import { OwnersSection } from '@/components/settings/OwnersSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { FormField } from '@/components/ui/form-field'
import { MaskedInput } from '@/components/ui/masked-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { ROLES, ROLE_DESCRIPTIONS, EMPLOYEE_DEPARTMENTS, LEAD_STATUSES, ORDER_STATUSES } from '@/lib/constants'
import { displayUsername, isInternalAuthEmail } from '@/lib/auth-username'
import { deleteSystemUser, resetUserPassword } from '@/services/users.service'
import { canManageUsers, canManageSettings } from '@/lib/permissions'
import { queryKeys } from '@/lib/query-keys'
import { isSystemAdminProfile, filterHiddenSystemAdmins } from '@/lib/system-admin'
import { SystemAdminSection } from '@/components/settings/SystemAdminSection'
import {
  createMaterialCategory,
  deleteMaterialCategory,
  updateMaterialCategory,
  type MaterialCategoryUsageType,
} from '@/services/material-categories.service'
import { useMaterialCategories, useInvalidateMaterialCategories } from '@/hooks/useMaterialCategories'
import { saveLumberCreditSettings } from '@/services/lumberyard-credit.service'
import {
  DEFAULT_SECRETARY_ACCESS,
  SECRETARY_MODULE_KEYS,
  SECRETARY_MODULE_LABELS,
  saveSecretaryAccessSettings,
  type SecretaryAccessSettings,
  type SecretaryModuleKey,
} from '@/services/secretary-access.service'
import { useAuthStore } from '@/stores/authStore'
import { useConfirm } from '@/hooks/useConfirm'
import type { UserRole } from '@/types'

interface CompanySettings {
  name: string
  document: string
  phone: string
  email: string
  address: string
}

interface SystemUser {
  id: string
  full_name: string
  email: string
  username: string | null
  role_id: string
  is_system_admin?: boolean
  role?: { name: string; label: string }
  employee?: { id: string; name: string; position: string } | null
}

interface RoleOption {
  id: string
  name: UserRole
  label: string
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps: confirmDialogProps } = useConfirm()
  const currentRole = useAuthStore((s) => s.profile?.role?.name)
  const currentProfile = useAuthStore((s) => s.profile)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const isSystemAdmin = isSystemAdminProfile(currentProfile)
  const canEditUsers = canManageUsers(currentRole, isSystemAdmin)
  const canEditCategories = canManageSettings(currentRole)
  const { materiaPrimaCategories, consumoCategories } = useMaterialCategories()
  const invalidateCategories = useInvalidateMaterialCategories()

  const [company, setCompany] = useState<CompanySettings>({ name: '', document: '', phone: '', email: '', address: '' })
  const [users, setUsers] = useState<SystemUser[]>([])
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState(50000)
  const [goalEnabled, setGoalEnabled] = useState(false)
  const [allowCrossClientCredit, setAllowCrossClientCredit] = useState(false)
  const [secretaryAccess, setSecretaryAccess] = useState<SecretaryAccessSettings>(DEFAULT_SECRETARY_ACCESS)
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({})
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [newMateriaCategoryName, setNewMateriaCategoryName] = useState('')
  const [newConsumoCategoryName, setNewConsumoCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('')
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  const loadUsers = async () => {
    const [{ data: usersData }, { data: rolesData }] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, email, username, role_id, is_system_admin, role:roles(name, label), employee:employees(id, name, position)')
        .is('deleted_at', null)
        .order('full_name'),
      supabase
        .from('roles')
        .select('id, name, label')
        .in('name', ROLES.map((r) => r.value))
        .is('deleted_at', null),
    ])

    setUsers((usersData ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      username: u.username ?? null,
      role_id: u.role_id,
      is_system_admin: u.is_system_admin ?? false,
      role: Array.isArray(u.role) ? u.role[0] : u.role,
      employee: Array.isArray(u.employee) ? u.employee[0] ?? null : u.employee,
    })))

    setRoleOptions((rolesData ?? []).map((r) => ({
      id: r.id,
      name: r.name as UserRole,
      label: r.label,
    })))
  }

  useEffect(() => {
    async function load() {
      const [{ data: settings }, { data: goals }, { data: lumberCredit }, { data: secretary }] = await Promise.all([
        supabase.from('settings').select('*').eq('key', 'company').single(),
        supabase.from('settings').select('*').eq('key', 'goals').maybeSingle(),
        supabase.from('settings').select('*').eq('key', 'lumber_credit').maybeSingle(),
        supabase.from('settings').select('*').eq('key', 'secretary_access').maybeSingle(),
      ])
      if (settings?.value) setCompany(settings.value as CompanySettings)
      const goalsVal = goals?.value as {
        monthly_revenue_goal?: number
        monthly_goal_enabled?: boolean
      } | undefined
      if (goalsVal?.monthly_revenue_goal) setMonthlyGoal(goalsVal.monthly_revenue_goal)
      setGoalEnabled(goalsVal?.monthly_goal_enabled ?? Boolean(goalsVal?.monthly_revenue_goal))

      const lumberVal = lumberCredit?.value as { allow_cross_client?: boolean } | undefined
      setAllowCrossClientCredit(lumberVal?.allow_cross_client ?? false)

      const secretaryVal = secretary?.value as Partial<SecretaryAccessSettings> | undefined
      let canViewAmounts = secretaryVal?.can_view_amounts
      if (typeof canViewAmounts !== 'boolean') {
        const { data: financial } = await supabase.from('settings').select('value').eq('key', 'financial').maybeSingle()
        const financialVal = financial?.value as { secretary_can_view_summary?: boolean } | undefined
        canViewAmounts = financialVal?.secretary_can_view_summary ?? false
      }
      setSecretaryAccess({
        modules: { ...DEFAULT_SECRETARY_ACCESS.modules, ...secretaryVal?.modules },
        can_view_amounts: canViewAmounts ?? false,
      })

      await loadUsers()
      setLoading(false)
    }
    load()
  }, [])

  const saveCompany = async () => {
    const { error } = await supabase.from('settings').update({ value: company }).eq('key', 'company')
    if (error) toast.error(error.message)
    else toast.success('Dados da empresa salvos!')
  }

  const saveGoals = async () => {
    const { data: existing } = await supabase.from('settings').select('id').eq('key', 'goals').maybeSingle()
    const payload = {
      key: 'goals',
      value: { monthly_revenue_goal: monthlyGoal, monthly_goal_enabled: goalEnabled },
    }
    const { error } = existing
      ? await supabase.from('settings').update({ value: payload.value }).eq('key', 'goals')
      : await supabase.from('settings').insert(payload)
    if (error) toast.error(error.message)
    else toast.success('Meta mensal atualizada!')
  }

  const saveLumberCredit = async () => {
    try {
      await saveLumberCreditSettings({ allow_cross_client: allowCrossClientCredit })
      await queryClient.invalidateQueries({ queryKey: ['lumber-credit'] })
      toast.success('Configurações do crédito madereira salvas!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar configurações')
    }
  }

  const saveSecretaryAccess = async () => {
    try {
      await saveSecretaryAccessSettings(secretaryAccess)
      await queryClient.invalidateQueries({ queryKey: queryKeys.secretaryAccess })
      toast.success('Acesso da secretária atualizado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar acesso da secretária')
    }
  }

  const setSecretaryModule = (key: SecretaryModuleKey, enabled: boolean) => {
    setSecretaryAccess((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: enabled },
    }))
  }

  const updateUserRole = async (userId: string, roleId: string) => {
    setSavingUserId(userId)
    const { error } = await supabase.from('users').update({ role_id: roleId }).eq('id', userId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Perfil atualizado!')
      await loadUsers()
    }
    setSavingUserId(null)
  }

  const handleResetPassword = async (userId: string) => {
    const password = passwordDrafts[userId]?.trim() ?? ''
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }
    setResettingUserId(userId)
    try {
      await resetUserPassword(userId, password)
      toast.success('Senha atualizada!')
      setPasswordDrafts((current) => ({ ...current, [userId]: '' }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar senha')
    } finally {
      setResettingUserId(null)
    }
  }

  const handleDeleteUser = async (user: SystemUser) => {
    if (user.id === currentUserId) {
      toast.error('Você não pode excluir o próprio usuário')
      return
    }

    const username = displayUsername(user.username, user.email)
    const employeeNote = user.employee
      ? ` O vínculo com o funcionário "${user.employee.name}" será removido, mas o cadastro do colaborador permanece.`
      : ''

    if (!await confirm({
      title: 'Excluir usuário?',
      message: `Deseja excluir o acesso de "${user.full_name}" (${username})? O login será revogado e não poderá ser desfeito.${employeeNote}`,
      confirmLabel: 'Excluir usuário',
    })) return

    setDeletingUserId(user.id)
    try {
      await deleteSystemUser(user.id)
      toast.success('Usuário excluído')
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir usuário')
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleAddCategory = async (usageType: MaterialCategoryUsageType) => {
    if (!canEditCategories) return
    const name = usageType === 'consumo' ? newConsumoCategoryName : newMateriaCategoryName
    setSavingCategory(true)
    try {
      await createMaterialCategory(name, usageType)
      if (usageType === 'consumo') setNewConsumoCategoryName('')
      else setNewMateriaCategoryName('')
      await invalidateCategories()
      toast.success('Categoria adicionada!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar categoria')
    } finally {
      setSavingCategory(false)
    }
  }

  const startEditCategory = (id: string, label: string) => {
    setEditingCategoryId(id)
    setEditingCategoryLabel(label)
  }

  const cancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditingCategoryLabel('')
  }

  const handleSaveCategory = async () => {
    if (!editingCategoryId || !canEditCategories) return
    setSavingCategory(true)
    try {
      await updateMaterialCategory(editingCategoryId, editingCategoryLabel)
      cancelEditCategory()
      await invalidateCategories()
      toast.success('Categoria atualizada!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar categoria')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (
    id: string,
    value: string,
    label: string,
    usageType: MaterialCategoryUsageType,
  ) => {
    if (!canEditCategories) return
    if (!await confirm({
      title: 'Excluir categoria',
      message: `Deseja excluir a categoria "${label}"?`,
    })) return
    setDeletingCategoryId(id)
    try {
      await deleteMaterialCategory(id, value, usageType)
      await invalidateCategories()
      toast.success('Categoria excluída!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir categoria')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const operationalUsers = filterHiddenSystemAdmins(
    users.filter((u) => u.role?.name !== 'gestor' || Boolean(u.employee)),
  )

  const categorySectionProps = {
    canEdit: canEditCategories,
    saving: savingCategory,
    editingCategoryId,
    editingCategoryLabel,
    onEditingLabelChange: setEditingCategoryLabel,
    onCancelEdit: cancelEditCategory,
    onSaveEdit: () => void handleSaveCategory(),
    deletingCategoryId,
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>

  return (
    <div>
      <PageHeader title="Configurações" description="Empresa, usuários, perfis e status" />

      <Tabs defaultValue="company">
        <TabsList className="mb-6">
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          {canEditCategories && <TabsTrigger value="secretary-access">Acesso secretária</TabsTrigger>}
          {canEditCategories && <TabsTrigger value="lumber-credit">Crédito madereira</TabsTrigger>}
          <TabsTrigger value="owners">Proprietários</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="categories">Perfis</TabsTrigger>
          <TabsTrigger value="statuses">Status</TabsTrigger>
          {isSystemAdmin && <TabsTrigger value="system-admin">Administração</TabsTrigger>}
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <FormField label="Nome">
                <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
              </FormField>
              <FormField label="CNPJ">
                <MaskedInput mask="cpfCnpj" value={company.document} onChange={(v) => setCompany({ ...company, document: v })} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Telefone">
                  <MaskedInput mask="phone" value={company.phone} onChange={(v) => setCompany({ ...company, phone: v })} />
                </FormField>
                <FormField label="E-mail">
                  <Input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Endereço">
                <Input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
              </FormField>
              <Button onClick={saveCompany}>Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader><CardTitle>Metas do Cockpit</CardTitle></CardHeader>
            <CardContent className="space-y-5 max-w-lg">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-surface-elevated px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="goal-enabled" className="text-sm font-medium text-white light:text-gray-900">
                    Meta mensal ativa
                  </Label>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {goalEnabled ? 'ON — exibe meta e progresso no cockpit' : 'OFF — oculta meta no dashboard'}
                  </p>
                </div>
                <Switch
                  id="goal-enabled"
                  checked={goalEnabled}
                  onCheckedChange={setGoalEnabled}
                  aria-label="Ativar meta mensal"
                />
              </div>
              <FormField
                label="Meta de receita mensal"
                hint={goalEnabled ? 'Valor usado na barra de progresso do cockpit' : 'Ative a meta acima para exibir no dashboard'}
              >
                <CurrencyInput
                  value={monthlyGoal}
                  onChange={setMonthlyGoal}
                  disabled={!goalEnabled}
                />
              </FormField>
              <Button onClick={saveGoals}>Salvar metas</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canEditCategories && (
          <TabsContent value="secretary-access">
            <Card>
              <CardHeader>
                <CardTitle>Acesso da secretária</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-gold/40 bg-surface-elevated px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="secretary-view-amounts" className="text-sm font-medium text-white light:text-gray-900">
                      Ver valores monetários
                    </Label>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {secretaryAccess.can_view_amounts
                        ? 'ON — vê valores em pedidos, financeiro, crédito madeireira e KPIs'
                        : 'OFF — acessa as telas, mas valores ficam ocultos (•••)'}
                    </p>
                  </div>
                  <Switch
                    id="secretary-view-amounts"
                    checked={secretaryAccess.can_view_amounts}
                    onCheckedChange={(v) => setSecretaryAccess((prev) => ({ ...prev, can_view_amounts: v }))}
                    aria-label="Permitir secretária ver valores monetários"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-white light:text-gray-900">Módulos liberados</p>
                  <p className="text-xs text-gray-500">
                    Configurações permanece exclusiva do proprietário.
                  </p>
                  {SECRETARY_MODULE_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-surface-elevated px-4 py-3"
                    >
                      <Label htmlFor={`secretary-mod-${key}`} className="text-sm text-white light:text-gray-900">
                        {SECRETARY_MODULE_LABELS[key]}
                      </Label>
                      <Switch
                        id={`secretary-mod-${key}`}
                        checked={secretaryAccess.modules[key]}
                        onCheckedChange={(v) => setSecretaryModule(key, v)}
                        aria-label={SECRETARY_MODULE_LABELS[key]}
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={() => void saveSecretaryAccess()}>Salvar acesso</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canEditCategories && (
          <TabsContent value="lumber-credit">
            <Card>
              <CardHeader><CardTitle>Crédito da madereira</CardTitle></CardHeader>
              <CardContent className="space-y-5 max-w-lg">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-surface-elevated px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="lumber-cross-client" className="text-sm font-medium text-white light:text-gray-900">
                      Permitir uso entre clientes
                    </Label>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {allowCrossClientCredit
                        ? 'ON — saídas podem consumir crédito de qualquer cliente'
                        : 'OFF — cada saída usa apenas o saldo do cliente selecionado'}
                    </p>
                  </div>
                  <Switch
                    id="lumber-cross-client"
                    checked={allowCrossClientCredit}
                    onCheckedChange={setAllowCrossClientCredit}
                    aria-label="Permitir crédito entre clientes"
                  />
                </div>
                <Button onClick={() => void saveLumberCredit()}>Salvar configurações</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="owners" className="space-y-4">
          <OwnersSection canEdit={canEditUsers} />
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle>Usuários do Sistema</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Acessos de colaboradores (secretária e produção) criados pelo cadastro de funcionários.
                Proprietários são gerenciados na aba Proprietários.
                {canEditUsers ? ' Você pode alterar perfil, redefinir senha ou excluir acesso em caso de desligamento.' : ' Somente proprietários podem alterar perfis e senhas.'}
              </p>
              <div className="space-y-3">
                {operationalUsers.map((u) => (
                  <div key={u.id} className="rounded-lg bg-surface-elevated p-3 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-sm text-gold">
                          Usuário: {displayUsername(u.username, u.email)}
                        </p>
                        {!isInternalAuthEmail(u.email) && (
                          <p className="text-xs text-gray-500">E-mail: {u.email}</p>
                        )}
                        {u.employee && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Funcionário: {u.employee.name} · {u.employee.position}
                          </p>
                        )}
                      </div>
                      {canEditUsers && roleOptions.length > 0 ? (
                        <Select
                          value={u.role_id}
                          disabled={savingUserId === u.id}
                          onValueChange={(roleId) => void updateUserRole(u.id, roleId)}
                        >
                          <SelectTrigger className="w-full sm:w-52">
                            <SelectValue placeholder="Perfil" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.filter((r) => r.name !== 'gestor').map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-gold">{u.role?.label ?? '—'}</span>
                      )}
                    </div>
                    {canEditUsers && (
                      <div className="space-y-2 border-t border-border/40 pt-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">Nova senha</Label>
                            <Input
                              type="text"
                              placeholder="Mínimo 6 caracteres"
                              value={passwordDrafts[u.id] ?? ''}
                              onChange={(e) => setPasswordDrafts({ ...passwordDrafts, [u.id]: e.target.value })}
                            />
                          </div>
                          <Button
                            variant="outline"
                            disabled={resettingUserId === u.id || deletingUserId === u.id}
                            onClick={() => void handleResetPassword(u.id)}
                          >
                            {resettingUserId === u.id ? 'Salvando...' : 'Redefinir senha'}
                          </Button>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            disabled={deletingUserId === u.id || u.id === currentUserId}
                            onClick={() => void handleDeleteUser(u)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            {deletingUserId === u.id ? 'Excluindo...' : 'Excluir usuário'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader><CardTitle>Perfis de Acesso</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ROLES.map((r) => (
                <div key={r.value} className="rounded-lg border border-border/60 bg-surface-elevated p-3">
                  <p className="font-medium text-gold">{r.label}</p>
                  <p className="mt-1 text-sm text-gray-400">{ROLE_DESCRIPTIONS[r.value]}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Setores (Funcionários)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {EMPLOYEE_DEPARTMENTS.map((d) => (
                <div key={d.value} className="rounded-lg bg-surface-elevated p-2 text-sm">{d.label}</div>
              ))}
            </CardContent>
          </Card>
          <p className="mt-2 text-xs text-gray-500">
            Proprietários não usam setor de funcionário — cadastro em Configurações → Proprietários.
          </p>
          {!canEditCategories && (
            <p className="mt-4 text-sm text-gray-500">Somente gestores podem alterar categorias.</p>
          )}
          <MaterialCategoriesSection
            title="Categorias — Matéria-prima"
            description="Usadas no cadastro de insumos de produção (MDF, ferragens, etc.)"
            categories={materiaPrimaCategories}
            newCategoryName={newMateriaCategoryName}
            onNewCategoryNameChange={setNewMateriaCategoryName}
            onAdd={() => void handleAddCategory('materia_prima')}
            onStartEdit={(id, label) => startEditCategory(id, label)}
            onDelete={(id, value, label) => void handleDeleteCategory(id, value, label, 'materia_prima')}
            addPlaceholder="Nova categoria (ex.: Vidros)"
            {...categorySectionProps}
          />
          <MaterialCategoriesSection
            title="Categorias — Uso e consumo"
            description="Usadas no cadastro de materiais de escritório e consumo interno"
            categories={consumoCategories}
            newCategoryName={newConsumoCategoryName}
            onNewCategoryNameChange={setNewConsumoCategoryName}
            onAdd={() => void handleAddCategory('consumo')}
            onStartEdit={(id, label) => startEditCategory(id, label)}
            onDelete={(id, value, label) => void handleDeleteCategory(id, value, label, 'consumo')}
            addPlaceholder="Nova categoria (ex.: Limpeza)"
            {...categorySectionProps}
          />
        </TabsContent>

        <TabsContent value="statuses">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Status de Leads</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {LEAD_STATUSES.map((s) => <div key={s.value} className="text-sm p-2 rounded bg-surface-elevated">{s.label}</div>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Status de Pedidos</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {ORDER_STATUSES.map((s) => <div key={s.value} className="text-sm p-2 rounded bg-surface-elevated">{s.label}</div>)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isSystemAdmin && (
          <TabsContent value="system-admin">
            <SystemAdminSection />
          </TabsContent>
        )}
      </Tabs>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  )
}
