import type { UserProfile } from '@/types'

export const DEFAULT_BILLING_LOCK_MESSAGE =
  'O acesso ao sistema está temporariamente suspenso por pendência de pagamento. Entre em contato com a Elius Tecnologia.'

export function isSystemAdminProfile(profile: Pick<UserProfile, 'is_system_admin'> | null | undefined): boolean {
  return profile?.is_system_admin === true
}

export function isProtectedSystemAdminUser(user: { is_system_admin?: boolean | null }): boolean {
  return user.is_system_admin === true
}

export function filterHiddenSystemAdmins<T extends { is_system_admin?: boolean | null }>(users: T[]): T[] {
  return users.filter((user) => !isProtectedSystemAdminUser(user))
}
