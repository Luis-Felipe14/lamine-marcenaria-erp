import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EMPLOYEE_DEPARTMENT_NAMES } from '@/lib/constants'

export interface Department {
  id: string
  name: string
  label: string
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name, label')
      .is('deleted_at', null)
      .in('name', [...EMPLOYEE_DEPARTMENT_NAMES])
      .then(({ data }) => {
        const sorted = (data ?? []).sort(
          (a, b) => EMPLOYEE_DEPARTMENT_NAMES.indexOf(a.name as typeof EMPLOYEE_DEPARTMENT_NAMES[number])
            - EMPLOYEE_DEPARTMENT_NAMES.indexOf(b.name as typeof EMPLOYEE_DEPARTMENT_NAMES[number])
        )
        setDepartments(sorted)
      })
  }, [])

  return departments
}
