import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { DEFAULT_BILLING_LOCK_MESSAGE } from '@/lib/system-admin'
import {
  fetchSystemBillingStatus,
  setSystemBillingLock,
  type SystemBillingStatus,
} from '@/services/system-billing.service'

export function SystemAdminSection() {
  const [billing, setBilling] = useState<SystemBillingStatus>({
    locked: false,
    message: DEFAULT_BILLING_LOCK_MESSAGE,
  })
  const [loading, setLoading] = useState(true)
  const [savingLock, setSavingLock] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    void fetchSystemBillingStatus()
      .then(setBilling)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar status do sistema')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleToggleLock = async (locked: boolean) => {
    setSavingLock(true)
    try {
      const next = await setSystemBillingLock(locked, billing.message)
      setBilling(next)
      toast.success(locked ? 'Sistema bloqueado para os demais usuários' : 'Sistema liberado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar bloqueio')
    } finally {
      setSavingLock(false)
    }
  }

  const handleSaveMessage = async () => {
    setSavingLock(true)
    try {
      const next = await setSystemBillingLock(billing.locked, billing.message)
      setBilling(next)
      toast.success('Mensagem de bloqueio atualizada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar mensagem')
    } finally {
      setSavingLock(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da senha não confere')
      return
    }

    setChangingPassword(true)
    try {
      const email = (await supabase.auth.getUser()).data.user?.email
      if (!email) throw new Error('Sessão inválida')

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (reauthError) throw new Error('Senha atual incorreta')

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Senha alterada com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bloqueio por inadimplência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Quando ativo, todos os usuários da Laminê perdem o acesso ao ERP. Somente este administrador
            continua entrando no sistema para liberar o acesso após regularização do pagamento.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
            <div>
              <p className="font-medium text-white">Sistema bloqueado</p>
              <p className="text-xs text-gray-500">
                {billing.locked ? 'Acesso suspenso para proprietários e equipe' : 'Acesso normal para todos'}
              </p>
            </div>
            <Switch
              checked={billing.locked}
              disabled={savingLock}
              onCheckedChange={(checked) => void handleToggleLock(checked)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Mensagem exibida no login</Label>
            <Textarea
              value={billing.message}
              onChange={(e) => setBilling((current) => ({ ...current, message: e.target.value }))}
              rows={3}
            />
            <Button variant="outline" disabled={savingLock} onClick={() => void handleSaveMessage()}>
              Salvar mensagem
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minha senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-lg">
          <p className="text-sm text-gray-500">
            Por segurança, somente você pode alterar a senha deste administrador. Nenhum proprietário
            da Laminê consegue redefini-la.
          </p>
          <div>
            <Label className="text-xs text-gray-500">Senha atual</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Nova senha</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Confirmar nova senha</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button disabled={changingPassword} onClick={() => void handleChangePassword()}>
            {changingPassword ? 'Alterando...' : 'Alterar minha senha'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
