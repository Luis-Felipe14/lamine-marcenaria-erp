import { supabase } from '@/lib/supabase'
import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import { throwIfError } from '@/lib/supabase-helpers'

export interface InternalRequest {
  id: string
  number: number
  title: string
  description: string
  priority: string
  status: string
  requesting_department?: { label: string }
  responsible_department?: { label: string }
}

const SELECT_QUERY =
  '*, requesting_department:departments!requesting_department_id(label), responsible_department:departments!responsible_department_id(label)'

export async function listInternalRequestsPaginated(page: number, pageSize = PAGE_SIZE) {
  return paginatedQuery<InternalRequest>(
    'internal_requests',
    { page, pageSize },
    {
      select: SELECT_QUERY,
      orderBy: { column: 'created_at', ascending: false },
      softDelete: false,
    }
  )
}

export async function listInternalRequests(): Promise<InternalRequest[]> {
  const { data, error } = await supabase
    .from('internal_requests')
    .select(SELECT_QUERY)
    .order('created_at', { ascending: false })

  throwIfError(error, 'solicitações internas')
  return (data ?? []) as InternalRequest[]
}
