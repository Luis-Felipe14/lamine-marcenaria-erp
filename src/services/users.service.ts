import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

interface ProvisionLoginInput {
  username: string
  password: string
  full_name: string
  role_name: UserRole
}

interface ProvisionLoginResult {
  user_id: string
  username: string
  auth_email?: string
}

interface FunctionErrorBody {
  error?: string
  message?: string
}

async function invokeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase não configurado no .env')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  })

  let payload: T & FunctionErrorBody = {} as T & FunctionErrorBody
  const rawText = await response.text()
  if (rawText) {
    try {
      payload = JSON.parse(rawText) as T & FunctionErrorBody
    } catch {
      payload = { error: rawText } as T & FunctionErrorBody
    }
  }

  if (!response.ok) {
    const detail = payload.error ?? payload.message ?? rawText ?? `Erro ${response.status}`
    console.error(`[${functionName}]`, response.status, rawText || payload)
    throw new Error(detail)
  }

  if (payload.error) throw new Error(payload.error)
  return payload as T
}

export async function assertRoleExists(roleName: UserRole): Promise<void> {
  const { data, error } = await supabase
    .from('roles')
    .select('name, label')
    .eq('name', roleName)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error(
      `Perfil "${roleName}" não existe no banco. Execute as migrations 018 e 019 no SQL Editor do Supabase.`,
    )
  }
}

export async function provisionEmployeeLogin(input: ProvisionLoginInput): Promise<ProvisionLoginResult> {
  return invokeFunction<ProvisionLoginResult>('create-employee-login', {
    ...input,
    intent: 'employee',
  })
}

export async function provisionOwnerLogin(input: Omit<ProvisionLoginInput, 'role_name'>): Promise<ProvisionLoginResult> {
  return invokeFunction<ProvisionLoginResult>('create-employee-login', {
    ...input,
    role_name: 'gestor',
    intent: 'owner',
  })
}

export async function updateOwnerProfile(
  userId: string,
  input: { full_name: string; phone?: string | null },
) {
  const { error } = await supabase
    .from('users')
    .update({
      full_name: input.full_name,
      phone: input.phone ?? null,
    })
    .eq('id', userId)

  if (error) throw error
}

export async function resetUserPassword(userId: string, password: string): Promise<void> {
  await invokeFunction<{ success: boolean }>('reset-user-password', { user_id: userId, password })
}

export async function deleteSystemUser(userId: string): Promise<void> {
  await invokeFunction<{ success: boolean }>('delete-user', { user_id: userId })
}

export async function syncEmployeeUserProfile(userId: string, fullName: string, roleId: string) {
  const { error } = await supabase
    .from('users')
    .update({ full_name: fullName, role_id: roleId })
    .eq('id', userId)

  if (error) throw error
}
