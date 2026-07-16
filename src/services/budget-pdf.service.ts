import { supabase } from '@/lib/supabase'

/**
 * PDF longo vai direto ao Render (evita timeout/502 do Worker Cloudflare).
 * O health usa o proxy same-origin só para acordar o Render free.
 *
 * Dev: Vite proxy em /api/pdf → localhost:3001 (PDF_API_BASE vazio).
 * Prod: PDF em https://lamine-pdf.onrender.com; health em /api/pdf/health.
 */
const PDF_DIRECT_URL = (import.meta.env.VITE_PDF_DIRECT_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const PDF_UPSTREAM_DEFAULT = 'https://lamine-pdf.onrender.com'

function pdfApiBase(): string {
  if (PDF_DIRECT_URL) return PDF_DIRECT_URL
  if (import.meta.env.DEV) return ''
  return PDF_UPSTREAM_DEFAULT
}

function buildPdfUrl(budgetId: string): string {
  const path = `/api/pdf/budget/${budgetId}`
  const base = pdfApiBase()
  return base ? `${base}${path}` : path
}

function buildHealthUrl(): string {
  // Em produção preferimos o proxy Cloudflare (mesmo domínio) só para o wake.
  if (import.meta.env.PROD && !PDF_DIRECT_URL) return '/api/pdf/health'
  const base = pdfApiBase()
  return base ? `${base}/health` : '/api/pdf/health'
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

async function assertPdfBlob(blob: Blob): Promise<void> {
  const header = await blob.slice(0, 5).text()
  if (header.startsWith('%PDF')) return

  if (header.trimStart().startsWith('<!DOCTYPE') || header.trimStart().startsWith('<html')) {
    throw new Error(
      'Serviço de PDF não respondeu corretamente. Verifique o servidor no Render (lamine-pdf).',
    )
  }

  throw new Error('Arquivo recebido não é um PDF válido. Verifique o servidor de geração de PDF.')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Aguarda o Render free acordar antes da geração (Puppeteer). */
async function ensurePdfServerAwake(): Promise<void> {
  const healthUrl = buildHealthUrl()
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { cache: 'no-store' })
      if (response.ok) return
    } catch {
      // ainda acordando
    }
    await sleep(2500)
  }
}

async function fetchBudgetPdf(budgetId: string, accessToken: string): Promise<Response> {
  const url = buildPdfUrl(budgetId)
  const headers = { Authorization: `Bearer ${accessToken}` }

  await ensurePdfServerAwake()

  try {
    return await fetch(url, { headers })
  } catch (firstError) {
    await sleep(3000)
    try {
      return await fetch(url, { headers })
    } catch {
      throw firstError instanceof Error
        ? firstError
        : new Error('Falha de rede ao gerar PDF. Tente novamente em alguns segundos.')
    }
  }
}

export async function downloadBudgetProposalPdf(budgetId: string, budgetNumber: number, projectName: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  let response: Response
  try {
    response = await fetchBudgetPdf(budgetId, session.access_token)
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor de PDF. Se for a primeira tentativa após inatividade, aguarde ~30s e tente de novo.',
    )
  }

  if (!response.ok) {
    let message = 'Erro ao gerar PDF'
    try {
      const body = await response.json() as { error?: string }
      if (body.error) message = body.error
    } catch {
      if (response.status === 502) {
        message = 'Servidor de PDF indisponível (502). Aguarde alguns segundos e tente novamente.'
      }
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  await assertPdfBlob(blob)
  const fallback = `proposta_${budgetNumber}_${projectName.replace(/\s+/g, '_').toLowerCase()}.pdf`
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), fallback)
  triggerBrowserDownload(blob, filename)
}
