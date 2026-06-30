import { assertManager, corsHeaders, json } from '../_shared/manager-auth.ts'
import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
} from '../_shared/username.ts'

const ASSIGNABLE_ROLES = new Set(['gestor', 'secretaria', 'producao'])

type AdminClient = Awaited<ReturnType<typeof assertManager>> extends { adminClient: infer C } ? C : never

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await assertManager(req)
    if ('error' in auth && auth.error) return auth.error
    const { adminClient } = auth as { adminClient: AdminClient }

    let body: {
      username?: string
      password?: string
      full_name?: string
      role_name?: string
      intent?: string
    }

    try {
      body = await req.json()
    } catch {
      return json({ error: 'Corpo da requisição inválido' }, 400)
    }

    const usernameRaw = body.username?.trim() ?? ''
    const password = body.password ?? ''
    const fullName = body.full_name?.trim() ?? ''
    const roleName = body.role_name ?? ''
    const intent = body.intent ?? 'employee'

    if (!usernameRaw || !fullName || !roleName) {
      return json({ error: 'Informe usuário, nome e perfil' }, 400)
    }
    if (!isValidUsername(usernameRaw)) {
      return json({ error: 'Usuário inválido (mín. 2 caracteres, máx. 40)' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'A senha deve ter no mínimo 6 caracteres' }, 400)
    }
    if (!ASSIGNABLE_ROLES.has(roleName)) {
      return json({ error: `Perfil inválido: ${roleName}` }, 400)
    }
    if (roleName === 'gestor' && intent !== 'owner') {
      return json({ error: 'Proprietários devem ser cadastrados em Configurações → Proprietários' }, 400)
    }
    if (roleName !== 'gestor' && intent === 'owner') {
      return json({ error: 'Cadastro de proprietário aceita apenas perfil gestor' }, 400)
    }

    const username = normalizeUsername(usernameRaw)
    const authEmail = usernameToAuthEmail(username)

    const roleRow = await getRoleRow(adminClient, roleName)
    if (!roleRow) {
      const available = await listRoleNames(adminClient)
      return json({
        error: `Perfil "${roleName}" não encontrado. Disponíveis: ${available.join(', ') || 'nenhum'}.`,
      }, 400)
    }

    const { data: usernameTaken } = await adminClient
      .from('users')
      .select('id')
      .eq('username', username)
      .is('deleted_at', null)
      .maybeSingle()

    if (usernameTaken) {
      return json({ error: 'Este usuário já está em uso' }, 400)
    }

    const userId = await resolveOrCreateAuthUser(
      adminClient,
      username,
      authEmail,
      password,
      fullName,
      roleName,
      roleRow.id,
    )

    return json({ user_id: userId, username, auth_email: authEmail }, 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno'
    console.error('[create-employee-login]', message)
    const isClientError = /vinculado|usuário|senha|em uso|inválid|informe|perfil/i.test(message)
    return json({ error: message }, isClientError ? 400 : 500)
  }
})

async function getRoleRow(adminClient: AdminClient, roleName: string) {
  const { data, error } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .maybeSingle()
  if (error) throw new Error(`Erro ao buscar perfil: ${error.message}`)
  return data
}

async function listRoleNames(adminClient: AdminClient) {
  const { data } = await adminClient.from('roles').select('name').is('deleted_at', null)
  return (data ?? []).map((row) => String(row.name))
}

async function assertNotLinkedToEmployee(adminClient: AdminClient, userId: string) {
  const { data: linkedEmp } = await adminClient
    .from('employees')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (linkedEmp) {
    throw new Error(`Este usuário já está vinculado ao funcionário "${linkedEmp.name}".`)
  }
}

async function findAuthUserByEmail(adminClient: AdminClient, email: string) {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Erro ao buscar usuários: ${error.message}`)
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

async function upsertPublicProfile(
  adminClient: AdminClient,
  userId: string,
  username: string,
  authEmail: string,
  fullName: string,
  roleId: string,
) {
  const { data: existing } = await adminClient
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  const payload = {
    role_id: roleId,
    full_name: fullName,
    email: authEmail,
    username,
    is_active: true,
  }

  if (existing) {
    const { error } = await adminClient.from('users').update(payload).eq('id', userId)
    if (error) throw new Error(`Erro ao atualizar perfil: ${error.message}`)
    return
  }

  const { error } = await adminClient.from('users').insert({ id: userId, ...payload })
  if (error) {
    if (error.code === '23505') {
      const { error: updateError } = await adminClient.from('users').update(payload).eq('id', userId)
      if (updateError) throw new Error(`Erro ao atualizar perfil: ${updateError.message}`)
      return
    }
    throw new Error(`Erro ao criar perfil: ${error.message}`)
  }
}

async function resolveOrCreateAuthUser(
  adminClient: AdminClient,
  username: string,
  authEmail: string,
  password: string,
  fullName: string,
  roleName: string,
  roleId: string,
): Promise<string> {
  const existingAuth = await findAuthUserByEmail(adminClient, authEmail)

  if (existingAuth) {
    await assertNotLinkedToEmployee(adminClient, existingAuth.id)

    const { error: updateError } = await adminClient.auth.admin.updateUserById(existingAuth.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role_name: roleName,
        username,
        created_by_admin: 'true',
      },
    })

    if (updateError) {
      throw new Error(`Não foi possível atualizar o login: ${updateError.message}`)
    }

    await upsertPublicProfile(adminClient, existingAuth.id, username, authEmail, fullName, roleId)
    return existingAuth.id
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role_name: roleName,
      username,
      created_by_admin: 'true',
    },
  })

  if (error) {
    const lower = error.message.toLowerCase()
    if (lower.includes('database error')) {
      throw new Error(
        'Erro no banco ao criar login. Confirme se a migration 023/024 foi aplicada no Supabase.',
      )
    }
    throw new Error(error.message)
  }

  const userId = data.user?.id
  if (!userId) throw new Error('Usuário não foi criado no Auth')

  await upsertPublicProfile(adminClient, userId, username, authEmail, fullName, roleId)
  return userId
}
