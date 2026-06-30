import { useState } from 'react'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { exportToPDF, exportToExcel } from '@/lib/export'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getMaterialCategoryLabel, getMaterialUsageTypeLabel } from '@/lib/constants'

const reports = [
  { id: 'clients', title: 'Clientes', table: 'clients', headers: ['Nome', 'Documento', 'Telefone', 'E-mail'], fields: ['name', 'document', 'phone', 'email'] },
  { id: 'leads', title: 'Leads', table: 'leads', headers: ['Nome', 'Status', 'Origem', 'Valor'], fields: ['name', 'status', 'origin', 'estimated_value'] },
  { id: 'budgets', title: 'Orçamentos', table: 'budgets', headers: ['#', 'Projeto', 'Valor', 'Status'], fields: ['number', 'project_name', 'total_value', 'status'] },
  { id: 'orders', title: 'Pedidos', table: 'orders', headers: ['#', 'Valor', 'Status', 'Prazo'], fields: ['number', 'value', 'status', 'deadline'] },
  { id: 'materials', title: 'Estoque', table: 'materials', headers: ['Código', 'Material', 'Categoria', 'Tipo', 'Marca', 'Estoque', 'Mín', 'Máx', 'Local', 'Valor ref.'], fields: ['code', 'name', 'category', 'usage_type', 'brand', 'current_stock', 'min_stock', 'max_stock', 'location', 'unit_cost'] },
  { id: 'purchases', title: 'Compras', table: 'purchases', headers: ['#', 'Descrição', 'Total', 'Status'], fields: ['number', 'description', 'total_price', 'status'] },
  { id: 'financial', title: 'Financeiro', table: 'financial_transactions', headers: ['Tipo', 'Descrição', 'Categoria', 'Valor', 'NF', 'Parcela', 'Pagamento', 'Vencimento'], fields: ['type', 'description', 'category', 'amount', 'document_number', 'installment_number', 'payment_method', 'due_date'] },
  { id: 'campaigns', title: 'Investimentos em Marketing', table: 'campaigns', headers: ['Descrição', 'Prestador', 'Canal', 'Investimento', 'Pagamento', 'Data'], fields: ['name', 'provider_name', 'channel', 'investment', 'payment_status', 'start_date'] },
  { id: 'lumber_credit', title: 'Crédito Madereira', table: 'lumberyard_credit_movements', headers: ['Tipo', 'Data', 'Valor', 'NF', 'Observações'], fields: ['movement_type', 'movement_date', 'amount', 'invoice_number', 'notes'] },
]

export function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const generate = async (report: typeof reports[0], format: 'pdf' | 'excel') => {
    setLoading(report.id)
    try {
      const { data, error } = await supabase.from(report.table).select('*').is('deleted_at', null).limit(500)
      if (error) throw error
      const rows = (data ?? []).map((row) =>
        report.fields.map((f) => {
          const val = (row as Record<string, unknown>)[f]
          if (f.includes('value') || f.includes('amount') || f === 'investment' || f === 'unit_cost') {
            return formatCurrency(Number(val ?? 0))
          }
          if (f === 'category') return getMaterialCategoryLabel(String(val ?? ''))
          if (f === 'usage_type') return getMaterialUsageTypeLabel(String(val ?? ''))
          if (f.includes('date')) return formatDate(val as string)
          return String(val ?? '-')
        })
      )
      if (format === 'pdf') await exportToPDF(`Relatório - ${report.title}`, report.headers, rows)
      else await exportToExcel(`Relatório - ${report.title}`, report.headers, rows)
      toast.success('Relatório exportado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar relatório')
    }
    setLoading(null)
  }

  return (
    <div>
      <PageHeader title="Relatórios" description="Exportação em PDF e Excel" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader><CardTitle className="text-base">{report.title}</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant="outline" disabled={loading === report.id} onClick={() => generate(report, 'pdf')}>
                <FileDown className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button size="sm" variant="outline" disabled={loading === report.id} onClick={() => generate(report, 'excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
