import { isSystemAdminProfile } from '@/lib/system-admin'
import { DEFAULT_BILLING_LOCK_MESSAGE } from '@/lib/system-admin'
import { fetchSystemBillingStatus } from '@/services/system-billing.service'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/types'

export class BillingAccessDeniedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BillingAccessDeniedError'
  }
}

function parsePermissions(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export async function assertBillingAccess(profile: UserProfile | null) {
  if (!profile || isSystemAdminProfile(profile)) return
  const status = await fetchSystemBillingStatus()
  if (status.locked) {
    throw new BillingAccessDeniedError(status.message)
  }
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      role:roles(name, label, permissions),
      user_departments(department:departments(id, name, label))
    `)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[Auth] Erro ao carregar perfil:', error.message)
  }

  if (!data) {
    const { data: basic, error: basicError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (basicError || !basic) {
      console.error('[Auth] Perfil não encontrado em public.users')
      return null
    }

    const { data: roleData } = await supabase
      .from('roles')
      .select('name, label, permissions')
      .eq('id', basic.role_id)
      .maybeSingle()

    return {
      id: basic.id,
      email: basic.email,
      full_name: basic.full_name,
      avatar_url: basic.avatar_url,
      role_id: basic.role_id,
      phone: basic.phone,
      is_active: basic.is_active,
      is_system_admin: (basic as { is_system_admin?: boolean }).is_system_admin,
      role: roleData
        ? {
            name: roleData.name as UserRole,
            label: roleData.label,
            permissions: parsePermissions(roleData.permissions),
          }
        : undefined,
      departments: [],
    }
  }

  const row = data as Record<string, unknown>
  const role = row.role as { name: string; label: string; permissions: unknown } | null
  const deps = (row.user_departments as { department: { id: string; name: string; label: string } }[]) ?? []

  return {
    id: row.id as string,
    email: row.email as string,
    full_name: row.full_name as string,
    avatar_url: row.avatar_url as string | null,
    role_id: row.role_id as string,
    phone: row.phone as string | null,
    is_active: row.is_active as boolean,
    is_system_admin: row.is_system_admin as boolean | undefined,
    role: role
      ? {
          name: role.name as UserRole,
          label: role.label,
          permissions: parsePermissions(role.permissions),
        }
      : undefined,
    departments: deps.map((d) => d.department).filter(Boolean) as UserProfile['departments'],
  }
}

export async function loadAuthenticatedProfile(userId: string): Promise<UserProfile | null> {
  const profile = await fetchProfile(userId)
  await assertBillingAccess(profile)
  return profile
}

export async function rejectBlockedSession(message = DEFAULT_BILLING_LOCK_MESSAGE) {
  await supabase.auth.signOut()
  throw new BillingAccessDeniedError(message)
}

export function getBillingDeniedMessage(error: unknown): string {
  if (error instanceof BillingAccessDeniedError) return error.message
  if (error instanceof Error && error.message) return error.message
  return DEFAULT_BILLING_LOCK_MESSAGE
}
