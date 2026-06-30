import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/supabase-helpers'
import { PAGE_SIZE } from '@/lib/constants'
import { paginatedQuery } from '@/services/api'
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, parseISO, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface MarketingInvestment {
  id: string
  name: string
  channel: string
  investment: number
  start_date: string
  end_date: string | null
  is_active: boolean
  notes: string | null
  provider_name: string | null
  payment_status: string
  created_at: string
}

export interface InvestmentStats {
  monthTotal: number
  yearTotal: number
  lastEntry: MarketingInvestment | null
  monthlyAverage: number
  pendingTotal: number
  byMonth: { month: string; total: number }[]
  byChannel: { channel: string; total: number }[]
}

const emptyStats: InvestmentStats = {
  monthTotal: 0,
  yearTotal: 0,
  lastEntry: null,
  monthlyAverage: 0,
  pendingTotal: 0,
  byMonth: [],
  byChannel: [],
}

export async function listInvestments(): Promise<MarketingInvestment[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })

  throwIfError(error, 'list investments')
  return (data ?? []) as MarketingInvestment[]
}

export async function listInvestmentsPaginated(
  year: number,
  month: number | 'all',
  page: number,
  pageSize = PAGE_SIZE
) {
  return paginatedQuery<MarketingInvestment>(
    'campaigns',
    { page, pageSize },
    {
      orderBy: { column: 'start_date', ascending: false },
      filters: (q) => {
        let query = q.gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`)
        if (month !== 'all') {
          const start = format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
          const end = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd')
          query = query.gte('start_date', start).lte('start_date', end)
        }
        return query
      },
    }
  )
}

export function computeInvestmentStats(investments: MarketingInvestment[]): InvestmentStats {
  if (investments.length === 0) return emptyStats

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const yearStart = startOfYear(now)

  const monthTotal = investments
    .filter((i) => isWithinInterval(parseISO(i.start_date), { start: monthStart, end: monthEnd }))
    .reduce((s, i) => s + Number(i.investment), 0)

  const yearTotal = investments
    .filter((i) => parseISO(i.start_date) >= yearStart)
    .reduce((s, i) => s + Number(i.investment), 0)

  const pendingTotal = investments
    .filter((i) => i.payment_status === 'pendente')
    .reduce((s, i) => s + Number(i.investment), 0)

  const lastEntry = [...investments].sort(
    (a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime()
  )[0] ?? null

  const last6 = Array.from({ length: 6 }, (_, idx) => {
    const d = subMonths(now, 5 - idx)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const total = investments
      .filter((i) => isWithinInterval(parseISO(i.start_date), { start, end }))
      .reduce((s, i) => s + Number(i.investment), 0)
    return {
      month: format(d, 'MMM/yy', { locale: ptBR }),
      total,
    }
  })

  const monthlyAverage =
    last6.reduce((s, m) => s + m.total, 0) / Math.max(last6.filter((m) => m.total > 0).length, 1)

  const channelMap = new Map<string, number>()
  for (const inv of investments) {
    channelMap.set(inv.channel, (channelMap.get(inv.channel) ?? 0) + Number(inv.investment))
  }

  return {
    monthTotal,
    yearTotal,
    lastEntry,
    monthlyAverage,
    pendingTotal,
    byMonth: last6,
    byChannel: [...channelMap.entries()].map(([channel, total]) => ({ channel, total })),
  }
}

export async function getInvestmentStats(): Promise<InvestmentStats> {
  const investments = await listInvestments()
  return computeInvestmentStats(investments)
}

export function filterInvestments(
  investments: MarketingInvestment[],
  year: number,
  month: number | 'all'
): MarketingInvestment[] {
  return investments.filter((i) => {
    const d = parseISO(i.start_date)
    if (d.getFullYear() !== year) return false
    if (month === 'all') return true
    return d.getMonth() + 1 === month
  })
}
