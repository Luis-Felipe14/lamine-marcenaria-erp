import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ExpensesBarChartProps {
  data: { category: string; total: number }[]
}

export function ExpensesBarChart({ data }: ExpensesBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="category" stroke="#666" fontSize={11} />
        <YAxis stroke="#666" fontSize={11} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
        <Bar dataKey="total" fill="#c9a227" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
