import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvestmentStats } from '@/services/marketing.service'

interface MarketingChartsProps {
  stats: InvestmentStats
  channelLabel: (value: string) => string
  colors: string[]
}

export function MarketingCharts({ stats, channelLabel, colors }: MarketingChartsProps) {
  return (
    <>
      <Card className="glass-card">
        <CardHeader><CardTitle>Investimento por mês</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
              <Bar dataKey="total" fill="#c9a227" radius={[6, 6, 0, 0]} name="Investimento" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle>Investimento por canal</CardTitle></CardHeader>
        <CardContent>
          {stats.byChannel.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">Sem dados para exibir</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.byChannel}
                  dataKey="total"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  isAnimationActive={false}
                  label={({ channel, percent }) => `${channelLabel(channel)} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.byChannel.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                <Legend formatter={(v) => channelLabel(String(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </>
  )
}
