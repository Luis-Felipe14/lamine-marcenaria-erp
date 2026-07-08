import { supabase } from '@/lib/supabase'

const PDF_API_BASE = import.meta.env.VITE_PDF_API_URL ?? ''

function buildPdfUrl(budgetId: string): string {
  const path = `/api/pdf/budget/${budgetId}`
  return PDF_API_BASE ? `${PDF_API_BASE.replace(/\/$/, '')}${path}` : path
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const match = /filename="([^"]+)"/i.exec(header)
  return match?.[1] ?? fallback
}

export async function downloadBudgetProposalPdf(budgetId: string, budgetNumber: number, projectName: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const response = await fetch(buildPdfUrl(budgetId), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    let message = 'Erro ao gerar PDF'
    try {
      const body = await response.json() as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const fallback = `proposta_${budgetNumber}_${projectName.replace(/\s+/g, '_').toLowerCase()}.pdf`
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), fallback)
  triggerBrowserDownload(blob, filename)
}
