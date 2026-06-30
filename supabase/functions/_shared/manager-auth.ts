import { createClient } from 'npm:@supabase/supabase-js@2'

export const MANAGER_ROLES = new Set(['gestor', 'administrador', 'gestor_geral'])

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export async function assertManager(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: json({ error: 'Função não configurada no servidor' }, 500) }
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: json({ error: 'Sessão expirada. Faça login novamente.' }, 401) }
  }

  const token = authHeader.replace('Bearer ', '')
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: authData, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !authData.user) {
    return { error: json({ error: 'Sessão inválida. Faça login novamente.' }, 401) }
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('is_system_admin, role:roles(name, label)')
    .eq('id', authData.user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (profileError) {
    return { error: json({ error: `Erro ao validar gestor: ${profileError.message}` }, 500) }
  }

  if (!profile) {
    return { error: json({ error: 'Seu usuário não possui perfil cadastrado no sistema.' }, 403) }
  }

  const callerRole = Array.isArray(profile.role) ? profile.role[0]?.name : profile.role?.name
  const isSystemAdmin = profile.is_system_admin === true

  if (!isSystemAdmin && (!callerRole || !MANAGER_ROLES.has(callerRole))) {
    const currentLabel = Array.isArray(profile.role)
      ? profile.role[0]?.label
      : profile.role?.label
    return {
      error: json({
        error: `Somente gestores podem executar esta ação. Perfil atual: ${currentLabel ?? callerRole ?? 'desconhecido'}.`,
      }, 403),
    }
  }

  return { adminClient, callerId: authData.user.id, isSystemAdmin }
}
