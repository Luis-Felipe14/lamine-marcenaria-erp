import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface FinancialChartWidgetProps {
  data: { month: string; receitas: number; despesas: number }[]
}

export function FinancialChartWidget({ data }: FinancialChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a227" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#c9a227" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="month" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="receitas" stroke="#c9a227" fill="url(#goldGrad)" name="Receitas" strokeWidth={2} isAnimationActive={false} />
        <Area type="monotone" dataKey="despesas" stroke="#ef4444" fill="#ef444410" name="Despesas" strokeWidth={2} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
