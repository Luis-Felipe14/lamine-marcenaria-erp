import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import { throwIfError } from '@/lib/supabase-helpers'

export interface EmployeeBirthdayInfo {
  id: string
  name: string
  position: string
  birth_date: string
  department_label: string | null
  daysUntil: number
  isToday: boolean
  turningAge: number
}

export interface EmployeeBirthdaysResult {
  today: EmployeeBirthdayInfo[]
  thisMonth: EmployeeBirthdayInfo[]
  upcoming: EmployeeBirthdayInfo[]
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysUntilBirthday(birthDate: string, ref = new Date()): number {
  const [, month, day] = birthDate.split('-').map(Number)
  const today = startOfDay(ref)
  let next = new Date(today.getFullYear(), month - 1, day)
  if (next < today) {
    next = new Date(today.getFullYear() + 1, month - 1, day)
  }
  return Math.round((next.getTime() - today.getTime()) / 86_400_000)
}

function turningAge(birthDate: string, ref = new Date()): number {
  const [year, month, day] = birthDate.split('-').map(Number)
  const birthdayThisYear = new Date(ref.getFullYear(), month - 1, day)
  let age = ref.getFullYear() - year
  if (birthdayThisYear > ref) age -= 1
  return daysUntilBirthday(birthDate, ref) === 0 ? age : age + 1
}

export function buildBirthdayLists(
  rows: { id: string; name: string; position: string; birth_date: string; department?: { label: string } | null }[],
  ref = new Date()
): EmployeeBirthdaysResult {
  const currentMonth = ref.getMonth() + 1

  const enriched: EmployeeBirthdayInfo[] = rows.map((row) => {
    const days = daysUntilBirthday(row.birth_date, ref)
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      birth_date: row.birth_date,
      department_label: row.department?.label ?? null,
      daysUntil: days,
      isToday: days === 0,
      turningAge: turningAge(row.birth_date, ref),
    }
  })

  const today = enriched.filter((e) => e.isToday)
  const thisMonth = enriched
    .filter((e) => {
      const birthMonth = Number(e.birth_date.split('-')[1])
      return birthMonth === currentMonth && !e.isToday
    })
    .sort((a, b) => Number(a.birth_date.split('-')[2]) - Number(b.birth_date.split('-')[2]))

  const upcoming = enriched
    .filter((e) => e.daysUntil > 0 && e.daysUntil <= 30)
    .filter((e) => Number(e.birth_date.split('-')[1]) !== currentMonth)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  return { today, thisMonth, upcoming }
}

export async function fetchEmployeeBirthdays(): Promise<EmployeeBirthdaysResult> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, position, birth_date, department:departments(label)')
    .is('deleted_at', null)
    .eq('is_active', true)
    .not('birth_date', 'is', null)

  throwIfError(error, 'aniversariantes')
  const rows = (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    position: row.position as string,
    birth_date: row.birth_date as string,
    department: Array.isArray(row.department) ? row.department[0] ?? null : row.department,
  }))
  return buildBirthdayLists(rows)
}

export interface EmployeeListRow {
  id: string
  name: string
  position: string
  phone: string | null
  cpf: string | null
  birth_date: string | null
  salary: number | null
  admission_date: string | null
  is_active: boolean
  department_id: string | null
  user_id: string | null
  department?: { label: string; name: string } | { label: string; name: string }[] | null
  user?: unknown
}

export async function listEmployees(): Promise<EmployeeListRow[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*, department:departments(label, name), user:users(id, full_name, email, username, role:roles(name, label))')
    .is('deleted_at', null)
    .order('name')

  throwIfError(error, 'funcionários')
  return (data ?? []) as EmployeeListRow[]
}

export async function listEmployeesPaginated(page: number, pageSize = PAGE_SIZE) {
  return paginatedQuery<EmployeeListRow>(
    'employees',
    { page, pageSize },
    {
      select: '*, department:departments(label, name), user:users(id, full_name, email, username, role:roles(name, label))',
      orderBy: { column: 'name', ascending: true },
    }
  )
}
