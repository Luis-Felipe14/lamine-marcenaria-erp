import { supabase } from '@/lib/supabase'
import { getBudgetStatusLabel } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  DEFAULT_COMPANY,
  drawKeyValue,
  drawPdfFooter,
  drawPdfHeader,
  drawSectionTitle,
  loadLogoDataUrl,
  PDF_BRAND,
  TABLE_THEME,
  type CompanyInfo,
} from '@/lib/export-brand'

async function loadPdfLibs() {
  const [jspdfMod, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF: jspdfMod.default, autoTable: autoTableMod.default }
}

async function loadXlsx() {
  return import('xlsx')
}

async function fetchCompanyInfo(): Promise<CompanyInfo> {
  const { data } = await supabase.from('settings').select('value').eq('key', 'company').maybeSingle()
  const value = data?.value as Partial<CompanyInfo> | undefined
  if (!value?.name) return DEFAULT_COMPANY
  return {
    name: value.name || DEFAULT_COMPANY.name,
    document: value.document,
    phone: value.phone,
    email: value.email,
    address: value.address,
  }
}

function formatQuantity(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

function formatClientAddress(client: {
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
}): string {
  const street = [client.address_street, client.address_number].filter(Boolean).join(', ')
  const cityState = [client.address_city, client.address_state].filter(Boolean).join(' - ')
  return [street, client.address_complement, client.address_neighborhood, cityState, client.address_zip]
    .filter(Boolean)
    .join(' · ') || '—'
}

function applyFooters(doc: import('jspdf').default, company: CompanyInfo): void {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawPdfFooter(doc, company, i, total)
  }
}

export async function exportToPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const { jsPDF, autoTable } = await loadPdfLibs()
  const [logo, company] = await Promise.all([loadLogoDataUrl(), fetchCompanyInfo()])
  const doc = new jsPDF()
  const marginX = 14
  let y = drawPdfHeader(doc, company, logo, marginX)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...PDF_BRAND.text)
  doc.text(title, marginX, y)
  y += 10

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: y,
    margin: { left: marginX, right: marginX, bottom: 18 },
    ...TABLE_THEME,
  })

  applyFooters(doc, company)
  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`)
}

export async function exportToExcel(title: string, headers: string[], rows: (string | number)[][]) {
  const XLSX = await loadXlsx()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_').toLowerCase()}.xlsx`)
}

export interface BudgetExportItem {
  description: string
  material: string | null
  quantity: number
  unit_price: number
  total_price: number
}

export interface BudgetExportData {
  number: number
  date: string
  project_name: string
  environment: string | null
  measurements: string | null
  labor_cost: number
  materials_cost: number
  discount: number
  total_value: number
  status: string
  notes: string | null
  client?: {
    name: string
    document?: string | null
    phone?: string | null
    whatsapp?: string | null
    email?: string | null
    address_street?: string | null
    address_number?: string | null
    address_complement?: string | null
    address_neighborhood?: string | null
    address_city?: string | null
    address_state?: string | null
    address_zip?: string | null
  } | null
}

export type BudgetPdfDetailLevel = 'materiais' | 'valores'

export async function exportBudgetPDF(
  budget: BudgetExportData,
  items: BudgetExportItem[],
  options: { detailLevel?: BudgetPdfDetailLevel } = {},
) {
  const showMaterials = (options.detailLevel ?? 'materiais') === 'materiais'
  const { jsPDF, autoTable } = await loadPdfLibs()
  const [logo, company] = await Promise.all([loadLogoDataUrl(), fetchCompanyInfo()])
  const doc = new jsPDF()
  const marginX = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = drawPdfHeader(doc, company, logo, marginX)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...PDF_BRAND.text)
  doc.text(`Orçamento Nº ${budget.number}`, marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_BRAND.muted)
  doc.text(`Emitido em ${formatDate(budget.date)}`, pageWidth - marginX, y, { align: 'right' })
  y += 10

  const statusLabel = getBudgetStatusLabel(budget.status)
  doc.setFillColor(...PDF_BRAND.goldPale)
  doc.setDrawColor(...PDF_BRAND.gold)
  doc.setLineWidth(0.3)
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 8, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_BRAND.gold)
  doc.text(`Status: ${statusLabel}`, marginX + 4, y + 5.2)
  y += 14

  y = drawSectionTitle(doc, 'Dados do cliente', y, marginX)
  const client = budget.client
  if (client) {
    y = drawKeyValue(doc, 'Nome:', client.name, marginX, y)
    y = drawKeyValue(doc, 'Documento:', client.document ?? '—', marginX, y)
    const phone = client.whatsapp || client.phone
    y = drawKeyValue(doc, 'Contato:', phone ?? '—', marginX, y)
    y = drawKeyValue(doc, 'E-mail:', client.email ?? '—', marginX, y)
    y = drawKeyValue(doc, 'Endereço:', formatClientAddress(client), marginX, y)
  } else {
    y = drawKeyValue(doc, 'Cliente:', '—', marginX, y)
  }
  y += 4

  y = drawSectionTitle(doc, 'Projeto', y, marginX)
  y = drawKeyValue(doc, 'Projeto:', budget.project_name, marginX, y)
  if (budget.environment) y = drawKeyValue(doc, 'Ambiente:', budget.environment, marginX, y)
  if (budget.measurements) y = drawKeyValue(doc, 'Medidas:', budget.measurements, marginX, y)
  y += 4

  if (showMaterials) {
    y = drawSectionTitle(doc, 'Itens do orçamento', y, marginX)

    const itemRows = items.length > 0
      ? items.map((item) => [
          item.description,
          item.material ?? '—',
          formatQuantity(item.quantity),
          formatCurrency(item.unit_price),
          formatCurrency(item.total_price),
        ])
      : [['Nenhum item cadastrado', '—', '—', '—', '—']]

    autoTable(doc, {
      head: [['Descrição', 'Material', 'Qtd.', 'Valor unit.', 'Total']],
      body: itemRows,
      startY: y,
      margin: { left: marginX, right: marginX, bottom: 22 },
      ...TABLE_THEME,
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
    })

    const finalY = (doc as import('jspdf').default & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
    y = finalY + 8
  } else {
    y = drawSectionTitle(doc, 'Resumo de valores', y, marginX)
    y += 2
  }

  const summaryX = pageWidth - marginX - 72
  const summaryWidth = 72
  const summaryLines = [
    { label: 'Materiais', value: formatCurrency(budget.materials_cost), bold: false },
    { label: 'Mão de obra', value: formatCurrency(budget.labor_cost), bold: false },
    ...(budget.discount > 0 ? [{ label: 'Desconto', value: `− ${formatCurrency(budget.discount)}`, bold: false }] : []),
    { label: 'TOTAL', value: formatCurrency(budget.total_value), bold: true },
  ]

  const boxHeight = summaryLines.length * 7 + 6
  if (y + boxHeight > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage()
    y = 20
  }

  doc.setFillColor(...PDF_BRAND.surface)
  doc.setDrawColor(...PDF_BRAND.gold)
  doc.setLineWidth(0.4)
  doc.roundedRect(summaryX, y, summaryWidth, boxHeight, 2, 2, 'FD')

  summaryLines.forEach((line, i) => {
    const lineY = y + 8 + i * 7
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal')
    doc.setFontSize(line.bold ? 11 : 9)
    doc.setTextColor(...(line.bold ? PDF_BRAND.gold : PDF_BRAND.text))
    doc.text(line.label, summaryX + 4, lineY)
    doc.text(line.value, summaryX + summaryWidth - 4, lineY, { align: 'right' })
  })

  y += boxHeight + 10

  if (budget.notes?.trim()) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      y = 20
    }
    y = drawSectionTitle(doc, 'Observações', y, marginX)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_BRAND.text)
    const noteLines = doc.splitTextToSize(budget.notes.trim(), pageWidth - marginX * 2)
    doc.text(noteLines, marginX, y)
    y += noteLines.length * 4.5 + 6
  }

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_BRAND.muted)
  const validityY = Math.min(y + 4, doc.internal.pageSize.getHeight() - 24)
  doc.text(
    'Este orçamento tem validade de 30 dias a partir da data de emissão. Valores sujeitos a alteração conforme disponibilidade de materiais.',
    marginX,
    validityY,
    { maxWidth: pageWidth - marginX * 2 }
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_BRAND.gold)
  doc.text('Obrigado pela confiança!', pageWidth / 2, validityY + 10, { align: 'center' })

  applyFooters(doc, company)
  doc.save(`orcamento_${budget.number}_${budget.project_name.replace(/\s+/g, '_').toLowerCase()}.pdf`)
}

export interface EmployeeReceiptExportData {
  employee_name: string
  employee_position: string
  amount: number
  receipt_date: string
  receipt_type_label: string
  reference_month_label: string
  description?: string | null
}

export async function exportEmployeeReceiptPDF(receipt: EmployeeReceiptExportData) {
  const { jsPDF } = await loadPdfLibs()
  const [logo, company] = await Promise.all([loadLogoDataUrl(), fetchCompanyInfo()])
  const doc = new jsPDF()
  const marginX = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = drawPdfHeader(doc, company, logo, marginX)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...PDF_BRAND.text)
  doc.text('Recibo de Pagamento', marginX, y)
  y += 10

  y = drawSectionTitle(doc, 'Dados do colaborador', y, marginX)
  y = drawKeyValue(doc, 'Nome:', receipt.employee_name, marginX, y)
  y = drawKeyValue(doc, 'Cargo:', receipt.employee_position, marginX, y + 1)
  y = drawKeyValue(doc, 'Referência:', receipt.reference_month_label, marginX, y + 1)
  y += 4

  y = drawSectionTitle(doc, 'Pagamento', y, marginX)
  y = drawKeyValue(doc, 'Tipo:', receipt.receipt_type_label, marginX, y)
  y = drawKeyValue(doc, 'Data:', formatDate(receipt.receipt_date), marginX, y + 1)
  if (receipt.description?.trim()) {
    y = drawKeyValue(doc, 'Descrição:', receipt.description.trim(), marginX, y + 1)
  }
  y += 6

  doc.setFillColor(...PDF_BRAND.surface)
  doc.rect(marginX, y, pageWidth - marginX * 2, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PDF_BRAND.text)
  doc.text('Valor recebido', marginX + 4, y + 5)
  doc.setTextColor(...PDF_BRAND.gold)
  doc.text(formatCurrency(receipt.amount), pageWidth - marginX - 4, y + 9, { align: 'right' })
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_BRAND.muted)
  const declaration = `Declaro ter recebido de ${company.name} a importância acima referente a ${receipt.receipt_type_label.toLowerCase()} (${receipt.reference_month_label}).`
  const lines = doc.splitTextToSize(declaration, pageWidth - marginX * 2)
  doc.text(lines, marginX, y)
  y += lines.length * 5 + 16

  doc.setDrawColor(...PDF_BRAND.border)
  doc.line(marginX + 20, y, pageWidth - marginX - 20, y)
  doc.setFontSize(8)
  doc.text(receipt.employee_name, pageWidth / 2, y + 5, { align: 'center' })
  doc.text('Assinatura do colaborador', pageWidth / 2, y + 10, { align: 'center' })

  applyFooters(doc, company)
  const safeName = receipt.employee_name.replace(/\s+/g, '_').toLowerCase()
  doc.save(`recibo_${safeName}_${receipt.receipt_date}.pdf`)
}
