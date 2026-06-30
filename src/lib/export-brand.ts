import type jsPDF from 'jspdf'
import { APP_LOGO } from '@/lib/branding'
import { APP_NAME, APP_SUBTITLE } from '@/lib/constants'

export const PDF_BRAND = {
  gold: [201, 162, 39] as [number, number, number],
  goldLight: [181, 159, 133] as [number, number, number],
  goldPale: [252, 248, 240] as [number, number, number],
  text: [26, 26, 26] as [number, number, number],
  muted: [115, 115, 115] as [number, number, number],
  border: [228, 224, 216] as [number, number, number],
  surface: [248, 246, 242] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

export interface CompanyInfo {
  name: string
  document?: string
  phone?: string
  email?: string
  address?: string
}

export const DEFAULT_COMPANY: CompanyInfo = {
  name: `${APP_NAME} ${APP_SUBTITLE}`,
}

export interface PdfLogo {
  dataUrl: string
  width: number
  height: number
}

let logoCache: PdfLogo | null | undefined

function trimBottomGoldBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): number {
  const maxScan = Math.ceil(height * 0.12)

  for (let y = height - 1; y >= height - maxScan; y--) {
    let barPixels = 0
    let sampled = 0

    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 48))) {
      sampled++
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data
      if (a < 16) continue

      const isGoldBar = r > 170 && g > 130 && b < 130 && r - b > 50
      if (isGoldBar) barPixels++
    }

    if (sampled > 0 && barPixels / sampled < 0.7) return y + 1
  }

  return height
}

async function loadRasterLogo(path: string, options?: { trimBottomBar?: boolean }): Promise<PdfLogo | null> {
  const response = await fetch(path)
  if (!response.ok) return null

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const width = img.naturalWidth || 320
      const height = img.naturalHeight || 88
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(objectUrl)
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      let outputWidth = width
      let outputHeight = height
      let outputDataUrl = canvas.toDataURL('image/png')

      if (options?.trimBottomBar) {
        const trimmedHeight = trimBottomGoldBar(ctx, width, height)
        if (trimmedHeight < height) {
          const trimmed = document.createElement('canvas')
          trimmed.width = width
          trimmed.height = trimmedHeight
          const trimmedCtx = trimmed.getContext('2d')
          if (trimmedCtx) {
            trimmedCtx.drawImage(canvas, 0, 0, width, trimmedHeight, 0, 0, width, trimmedHeight)
            outputWidth = width
            outputHeight = trimmedHeight
            outputDataUrl = trimmed.toDataURL('image/png')
          }
        }
      }

      resolve({
        dataUrl: outputDataUrl,
        width: outputWidth,
        height: outputHeight,
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
    img.src = objectUrl
  })
}

async function loadSvgLogo(path: string): Promise<PdfLogo | null> {
  const response = await fetch(path)
  if (!response.ok) return null

  const svgText = await response.text()
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const width = 320
      const height = 88
      const canvas = document.createElement('canvas')
      const scale = 3
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(objectUrl)
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
    img.src = objectUrl
  })
}

export async function loadLogoDataUrl(): Promise<PdfLogo | null> {
  if (logoCache !== undefined) return logoCache

  logoCache = await loadRasterLogo(APP_LOGO.primary, { trimBottomBar: true })
  if (!logoCache) logoCache = await loadSvgLogo(APP_LOGO.fallback)

  return logoCache
}

function companyContactLines(company: CompanyInfo): string[] {
  return [
    company.document ? `CNPJ/CPF: ${company.document}` : '',
    company.phone ? `Tel: ${company.phone}` : '',
    company.email ? company.email : '',
    company.address ?? '',
  ].filter(Boolean)
}

export function drawPdfHeader(
  doc: jsPDF,
  company: CompanyInfo,
  logo: PdfLogo | null,
  marginX = 14
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const rightX = pageWidth - marginX
  let y = 14

  if (logo) {
    const logoW = 58
    const logoH = logoW * (logo.height / logo.width)
    doc.addImage(logo.dataUrl, 'PNG', marginX, y, logoW, logoH)
    y = Math.max(y + logoH, 22)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...PDF_BRAND.gold)
    doc.text(company.name, marginX, y + 6)
    y += 14
  }

  const contactLines = companyContactLines(company)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_BRAND.muted)

  if (logo) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_BRAND.text)
    doc.text(company.name, rightX, 18, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_BRAND.muted)
    contactLines.forEach((line, i) => {
      doc.text(line, rightX, 24 + i * 4.2, { align: 'right', maxWidth: 90 })
    })
  } else {
    contactLines.forEach((line, i) => {
      doc.text(line, marginX, y + i * 4.2)
    })
    y += contactLines.length * 4.2
  }

  const contentStartY = logo ? 42 : y + 4
  return contentStartY + 8
}

export function drawSectionTitle(doc: jsPDF, title: string, y: number, marginX = 14): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const width = pageWidth - marginX * 2

  doc.setFillColor(...PDF_BRAND.surface)
  doc.rect(marginX, y, width, 7, 'F')
  doc.setFillColor(...PDF_BRAND.gold)
  doc.rect(marginX, y, 1.2, 7, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_BRAND.gold)
  doc.text(title.toUpperCase(), marginX + 4, y + 4.8)

  return y + 11
}

export function drawKeyValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth = 28
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_BRAND.muted)
  doc.text(label, x, y)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_BRAND.text)
  const lines = doc.splitTextToSize(value || '—', 120)
  doc.text(lines, x + labelWidth, y)
  return y + Math.max(lines.length * 4.5, 5)
}

export function drawPdfFooter(
  doc: jsPDF,
  company: CompanyInfo,
  pageNumber: number,
  totalPages: number,
  marginX = 14
): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 12

  doc.setDrawColor(...PDF_BRAND.border)
  doc.setLineWidth(0.3)
  doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...PDF_BRAND.muted)
  doc.text(company.name, marginX, footerY)
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' })
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - marginX, footerY, { align: 'right' })
}

export const TABLE_THEME = {
  styles: {
    fontSize: 8,
    textColor: PDF_BRAND.text,
    lineColor: PDF_BRAND.border,
    lineWidth: 0.1,
    cellPadding: 2.5,
  },
  headStyles: {
    fillColor: PDF_BRAND.gold,
    textColor: [20, 20, 20] as [number, number, number],
    fontStyle: 'bold' as const,
    halign: 'left' as const,
  },
  alternateRowStyles: {
    fillColor: PDF_BRAND.goldPale,
  },
  columnStyles: {
    right: { halign: 'right' as const },
  },
}
