import type { UserRole } from '@/types'

/** Perfil sugerido conforme o setor do funcionário (proprietários não passam por aqui) */
const DEPARTMENT_ROLE_MAP: Record<string, UserRole> = {
  secretaria: 'secretaria',
  operacional: 'producao',
}

export function getSuggestedRoleForDepartment(departmentName: string | undefined | null): UserRole | null {
  if (!departmentName) return null
  return DEPARTMENT_ROLE_MAP[departmentName] ?? null
}

export function getSuggestedRoleLabel(departmentName: string | undefined | null): string | null {
  const role = getSuggestedRoleForDepartment(departmentName)
  if (!role) return null
  const labels: Record<UserRole, string> = {
    gestor: 'Proprietário',
    secretaria: 'Secretaria',
    producao: 'Produção',
  }
  return labels[role]
}

/** Secretária recebe login por padrão; Produção fica opcional */
export function shouldOfferLoginByDefault(departmentName: string | undefined | null): boolean {
  return departmentName === 'secretaria'
}

export function canCreateEmployeeLogin(departmentName: string | undefined | null): boolean {
  return getSuggestedRoleForDepartment(departmentName) !== null
}
