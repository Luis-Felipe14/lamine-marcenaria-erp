import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaskedInput } from '@/components/ui/masked-input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { displayUsername, isInternalAuthEmail, isValidUsername, suggestUsernameFromName } from '@/lib/auth-username'
import { generateTemporaryPassword } from '@/lib/password'
import { useConfirm } from '@/hooks/useConfirm'
import { useAuthStore } from '@/stores/authStore'
import { assertRoleExists, deleteSystemUser, resetUserPassword } from '@/services/users.service'
import {
  createOwner,
  listOwners,
  saveOwnerProfile,
  setOwnerActive,
  type OwnerUser,
} from '@/services/owners.service'

interface OwnersSectionProps {
  canEdit: boolean
}

interface CreatedCredentials {
  name: string
  username: string
  password: string
}

const emptyForm = () => ({
  full_name: '',
  username: '',
  password: '',
  phone: '',
})

export function OwnersSection({ canEdit }: OwnersSectionProps) {
  const { confirm, dialogProps } = useConfirm()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [owners, setOwners] = useState<OwnerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null)
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({})
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [profileDrafts, setProfileDrafts] = useState<Record<string, { full_name: string; phone: string }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listOwners()
      setOwners(data)
      setProfileDrafts(
        Object.fromEntries(
          data.map((owner) => [
            owner.id,
            { full_name: owner.full_name, phone: owner.phone ?? '' },
          ]),
        ),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar proprietários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setForm({ ...emptyForm(), password: generateTemporaryPassword() })
    setDialogOpen(true)
  }

  const copyToClipboard = async (value: string, field: 'username' | 'password') => {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    toast.success('Copiado!')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleCreate = async () => {
    if (!form.full_name.trim()) {
      toast.error('Informe o nome')
      return
    }
    if (!form.username.trim()) {
      toast.error('Informe o usuário de acesso')
      return
    }
    if (!isValidUsername(form.username)) {
      toast.error('Usuário inválido (mín. 2 caracteres)')
      return
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setSubmitting(true)
    try {
      await assertRoleExists('gestor')
      const login = await createOwner({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        password: form.password,
        phone: form.phone,
      })
      setCreatedCredentials({
        name: form.full_name.trim(),
        username: login.username,
        password: form.password,
      })
      setDialogOpen(false)
      setForm(emptyForm())
      await load()
      toast.success('Proprietário cadastrado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cadastrar proprietário')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveProfile = async (owner: OwnerUser) => {
    const draft = profileDrafts[owner.id]
    if (!draft?.full_name.trim()) {
      toast.error('Informe o nome')
      return
    }
    setSavingUserId(owner.id)
    try {
      await saveOwnerProfile(owner.id, {
        full_name: draft.full_name,
        phone: draft.phone,
      })
      toast.success('Dados atualizados!')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSavingUserId(null)
    }
  }

  const handleToggleActive = async (owner: OwnerUser, isActive: boolean) => {
    try {
      await setOwnerActive(owner.id, isActive)
      toast.success(isActive ? 'Acesso reativado' : 'Acesso desativado')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar status')
    }
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

  const handleDeleteOwner = async (owner: OwnerUser) => {
    if (owner.id === currentUserId) {
      toast.error('Você não pode excluir o usuário com o qual está logado. Entre com a conta da proprietária e tente novamente.')
      return
    }

    const loginLabel = displayUsername(owner.username, owner.email)
    if (!await confirm({
      title: 'Excluir proprietário?',
      message: `Deseja remover o acesso de "${owner.full_name}" (${loginLabel})? O login será revogado permanentemente.`,
      confirmLabel: 'Excluir',
    })) return

    setDeletingUserId(owner.id)
    try {
      await deleteSystemUser(owner.id)
      toast.success('Proprietário excluído')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir proprietário')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Proprietários</CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              Sócios e donos da empresa — acesso total ao ERP, sem vínculo com a folha de funcionários.
            </p>
          </div>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Novo proprietário
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : owners.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum proprietário cadastrado. {canEdit ? 'Use o botão acima para criar o primeiro acesso.' : ''}
            </p>
          ) : (
            <div className="space-y-3">
              {owners.map((owner) => {
                const draft = profileDrafts[owner.id] ?? {
                  full_name: owner.full_name,
                  phone: owner.phone ?? '',
                }
                const username = displayUsername(owner.username, owner.email)

                return (
                  <div key={owner.id} className="rounded-lg bg-surface-elevated p-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{owner.full_name}</p>
                        <p className="text-sm text-gold">Usuário: {username}</p>
                        {!isInternalAuthEmail(owner.email) && (
                          <p className="text-xs text-gray-500">E-mail: {owner.email}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Perfil: {owner.role?.label ?? 'Proprietário'}
                          {!owner.is_active && (
                            <span className="ml-2 text-red-400">· Acesso desativado</span>
                          )}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2">
                          <Label htmlFor={`active-${owner.id}`} className="text-xs text-gray-500">
                            Acesso ativo
                          </Label>
                          <Switch
                            id={`active-${owner.id}`}
                            checked={owner.is_active}
                            onCheckedChange={(checked) => void handleToggleActive(owner, checked)}
                          />
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <>
                        <div className="grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs text-gray-500">Nome</Label>
                            <Input
                              value={draft.full_name}
                              onChange={(e) => setProfileDrafts({
                                ...profileDrafts,
                                [owner.id]: { ...draft, full_name: e.target.value },
                              })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Telefone</Label>
                            <MaskedInput
                              mask="phone"
                              value={draft.phone}
                              onChange={(phone) => setProfileDrafts({
                                ...profileDrafts,
                                [owner.id]: { ...draft, phone },
                              })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2 border-t border-border/40 pt-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Button
                              variant="outline"
                              disabled={savingUserId === owner.id || deletingUserId === owner.id}
                              onClick={() => void handleSaveProfile(owner)}
                            >
                              {savingUserId === owner.id ? 'Salvando...' : 'Salvar dados'}
                            </Button>
                            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                              <div className="flex-1">
                                <Label className="text-xs text-gray-500">Nova senha</Label>
                                <Input
                                  type="text"
                                  placeholder="Mínimo 6 caracteres"
                                  value={passwordDrafts[owner.id] ?? ''}
                                  onChange={(e) => setPasswordDrafts({
                                    ...passwordDrafts,
                                    [owner.id]: e.target.value,
                                  })}
                                />
                              </div>
                              <Button
                                variant="outline"
                                disabled={resettingUserId === owner.id || deletingUserId === owner.id}
                                onClick={() => void handleResetPassword(owner.id)}
                              >
                                {resettingUserId === owner.id ? 'Salvando...' : 'Redefinir senha'}
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              disabled={deletingUserId === owner.id || owner.id === currentUserId}
                              onClick={() => void handleDeleteOwner(owner)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              {deletingUserId === owner.id ? 'Excluindo...' : 'Excluir proprietário'}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo proprietário</DialogTitle>
            <DialogDescription>
              Cria login com perfil Proprietário. Não gera registro em funcionários nem folha de pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input
                value={form.full_name}
                onChange={(e) => {
                  const full_name = e.target.value
                  setForm((current) => ({
                    ...current,
                    full_name,
                    username: !current.username.trim()
                      ? suggestUsernameFromName(full_name)
                      : current.username,
                  }))
                }}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <MaskedInput
                mask="phone"
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
              />
            </div>
            <div>
              <Label>Usuário de acesso</Label>
              <Input
                placeholder="Ex: JOAO S"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label>Senha inicial</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Gerar nova senha"
                  onClick={() => setForm({ ...form, password: generateTemporaryPassword() })}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Anote a senha para repassar ao proprietário. Mínimo de 6 caracteres.
              </p>
            </div>
            <Button className="w-full" disabled={submitting} onClick={() => void handleCreate()}>
              {submitting ? 'Cadastrando...' : 'Cadastrar proprietário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso criado</DialogTitle>
            <DialogDescription>
              Repasse as credenciais para {createdCredentials?.name}. Elas não serão exibidas novamente.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2">
                <div>
                  <p className="text-xs text-gray-500">Usuário</p>
                  <p className="font-medium">{createdCredentials.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void copyToClipboard(createdCredentials.username, 'username')}
                >
                  {copiedField === 'username' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2">
                <div>
                  <p className="text-xs text-gray-500">Senha</p>
                  <p className="font-medium">{createdCredentials.password}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void copyToClipboard(createdCredentials.password, 'password')}
                >
                  {copiedField === 'password' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </>
  )
}
