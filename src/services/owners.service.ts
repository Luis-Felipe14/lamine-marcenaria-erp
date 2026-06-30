import { supabase } from '@/lib/supabase'
import { provisionOwnerLogin, updateOwnerProfile } from '@/services/users.service'

export interface OwnerUser {
  id: string
  full_name: string
  email: string
  username: string | null
  phone: string | null
  is_active: boolean
  is_system_admin?: boolean
  role?: { name: string; label: string }
}

export async function listOwners(): Promise<OwnerUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, username, phone, is_active, is_system_admin, role:roles(name, label), employee:employees(id)')
    .is('deleted_at', null)
    .order('full_name')

  if (error) throw error

  return (data ?? [])
    .filter((row) => {
      const role = Array.isArray(row.role) ? row.role[0] : row.role
      const employee = Array.isArray(row.employee) ? row.employee[0] : row.employee
      return role?.name === 'gestor' && !employee && !row.is_system_admin
    })
    .map((row) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      username: row.username ?? null,
      phone: row.phone ?? null,
      is_active: row.is_active,
      role: Array.isArray(row.role) ? row.role[0] : row.role,
    }))
}

export async function createOwner(input: {
  full_name: string
  username: string
  password: string
  phone?: string
}) {
  const login = await provisionOwnerLogin({
    username: input.username.trim(),
    password: input.password,
    full_name: input.full_name.trim(),
  })

  if (input.phone?.trim()) {
    await updateOwnerProfile(login.user_id, {
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
    })
  }

  return login
}

export async function saveOwnerProfile(
  userId: string,
  input: { full_name: string; phone?: string | null },
) {
  await updateOwnerProfile(userId, {
    full_name: input.full_name.trim(),
    phone: input.phone?.trim() || null,
  })
}

export async function setOwnerActive(userId: string, isActive: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) throw error
}
