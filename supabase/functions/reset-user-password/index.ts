import { assertManager, corsHeaders, json } from '../_shared/manager-auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await assertManager(req)
    if ('error' in auth && auth.error) return auth.error
    const { adminClient, callerId } = auth as { adminClient: ReturnType<typeof import('npm:@supabase/supabase-js@2').createClient>; callerId: string }

    let body: { user_id?: string; password?: string }

    try {
      body = await req.json()
    } catch {
      return json({ error: 'Corpo da requisição inválido' }, 400)
    }

    const userId = body.user_id ?? ''
    const password = body.password ?? ''

    if (!userId) {
      return json({ error: 'Usuário não informado' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'A senha deve ter no mínimo 6 caracteres' }, 400)
    }

    const { data: target, error: targetError } = await adminClient
      .from('users')
      .select('id, full_name, username, is_system_admin')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target) return json({ error: 'Usuário não encontrado' }, 404)

    if (target.is_system_admin && userId !== callerId) {
      return json({ error: 'A senha do administrador do sistema só pode ser alterada por ele mesmo' }, 400)
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    })

    if (updateError) {
      return json({ error: `Não foi possível alterar a senha: ${updateError.message}` }, 400)
    }

    return json({ success: true, username: target.username }, 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno'
    return json({ error: message }, 500)
  }
})
