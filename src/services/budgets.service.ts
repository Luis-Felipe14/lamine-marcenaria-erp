import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'

export interface Budget {
  id: string
  number: number
  client_id: string
  project_name: string
  environment: string | null
  total_value: number
  status: string
  date: string
  client?: { name: string }
}

export async function listBudgetsPaginated(page: number, pageSize = PAGE_SIZE) {
  return paginatedQuery<Budget>(
    'budgets',
    { page, pageSize },
    {
      select: '*, client:clients(name)',
      orderBy: { column: 'created_at', ascending: false },
    },
  )
}
