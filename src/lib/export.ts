import { supabase } from '@/lib/supabase'
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
