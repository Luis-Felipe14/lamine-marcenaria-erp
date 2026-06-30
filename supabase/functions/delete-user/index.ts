import { assertManager, corsHeaders, json } from '../_shared/manager-auth.ts'

type AdminClient = Awaited<ReturnType<typeof assertManager>> extends { adminClient: infer C } ? C : never

function formatAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Erro desconhecido no Auth'
  const record = error as { message?: string; code?: string; status?: number; name?: string }
  return record.message || record.code || record.name || JSON.stringify(error)
}

async function revokeAuthLogin(adminClient: AdminClient, userId: string): Promise<void> {
  const { data: authUser, error: getError } = await adminClient.auth.admin.getUserById(userId)

  if (getError) {
    const msg = formatAuthError(getError)
    if (/not found|404/i.test(msg)) return
    throw new Error(`Erro ao localizar login: ${msg}`)
  }

  if (!authUser?.user) return

  const retiredEmail = `deleted.${userId.replace(/-/g, '').slice(0, 12)}@login.lamine.internal`

  const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: '876600h',
    email: retiredEmail,
    email_confirm: true,
    user_metadata: {
      ...authUser.user.user_metadata,
      deleted_at: new Date().toISOString(),
    },
  })

  if (!banError) return

  const banMsg = formatAuthError(banError)

  const { error: softDeleteError } = await adminClient.auth.admin.deleteUser(userId, true)
  if (!softDeleteError) return

  throw new Error(`Não foi possível revogar o login: ${banMsg} / ${formatAuthError(softDeleteError)}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await assertManager(req)
    if ('error' in auth && auth.error) return auth.error
    const { adminClient, callerId } = auth as { adminClient: AdminClient; callerId: string }

    let body: { user_id?: string }

    try {
      body = await req.json()
    } catch {
      return json({ error: 'Corpo da requisição inválido' }, 400)
    }

    const userId = body.user_id ?? ''
    if (!userId) {
      return json({ error: 'Usuário não informado' }, 400)
    }
    if (userId === callerId) {
      return json({ error: 'Você não pode excluir o próprio usuário' }, 400)
    }

    const { data: target, error: targetError } = await adminClient
      .from('users')
      .select('id, full_name, is_system_admin, role_id, role:roles(name, label)')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target) return json({ error: 'Usuário não encontrado' }, 404)

    if (target.is_system_admin) {
      return json({ error: 'O administrador do sistema não pode ser removido' }, 400)
    }

    const roleName = Array.isArray(target.role) ? target.role[0]?.name : target.role?.name
    if (roleName === 'gestor') {
      const { count, error: countError } = await adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role_id', target.role_id)
        .is('deleted_at', null)
        .neq('id', userId)

      if (countError) throw countError
      if ((count ?? 0) === 0) {
        return json({ error: 'Não é possível excluir o último proprietário do sistema' }, 400)
      }
    }

    const deletedAt = new Date().toISOString()

    const { error: unlinkError } = await adminClient
      .from('employees')
      .update({ user_id: null })
      .eq('user_id', userId)
      .is('deleted_at', null)

    if (unlinkError) {
      throw new Error(`Erro ao desvincular funcionário: ${unlinkError.message}`)
    }

    await revokeAuthLogin(adminClient, userId)

    const { error: profileError } = await adminClient
      .from('users')
      .update({ deleted_at: deletedAt, is_active: false })
      .eq('id', userId)

    if (profileError) {
      throw new Error(`Erro ao excluir perfil: ${profileError.message}`)
    }

    return json({ success: true, full_name: target.full_name }, 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno'
    console.error('[delete-user]', message)
    const isClientError = /não pode|não encontrado|informado|último proprietário/i.test(message)
    return json({ error: message }, isClientError ? 400 : 500)
  }
})
