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

async function assertPdfBlob(blob: Blob): Promise<void> {
  const header = await blob.slice(0, 5).text()
  if (header.startsWith('%PDF')) return

  if (header.trimStart().startsWith('<!DOCTYPE') || header.trimStart().startsWith('<html')) {
    throw new Error(
      'Serviço de PDF não configurado em produção. Defina VITE_PDF_API_URL no Cloudflare apontando para o servidor PDF (Render/Railway).',
    )
  }

  throw new Error('Arquivo recebido não é um PDF válido. Verifique o servidor de geração de PDF.')
}

/** Acorda o Render free (cold start) sem depender de CORS legível. */
async function wakePdfServerIfRemote(): Promise<void> {
  if (!PDF_API_BASE) return
  const healthUrl = `${PDF_API_BASE.replace(/\/$/, '')}/health`
  try {
    await fetch(healthUrl, { mode: 'no-cors', cache: 'no-store' })
  } catch {
    // ignore — o objetivo é só disparar a requisição de wake
  }
}

async function fetchBudgetPdf(budgetId: string, accessToken: string): Promise<Response> {
  const url = buildPdfUrl(budgetId)
  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    return await fetch(url, { headers })
  } catch (firstError) {
    // Plano free do Render: preflight falha enquanto o serviço acorda
    await wakePdfServerIfRemote()
    await new Promise((resolve) => setTimeout(resolve, 2500))
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

  // Acorda o Render free antes do preflight autenticado (evita falha de CORS no cold start)
  await wakePdfServerIfRemote()

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
      // ignore
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  await assertPdfBlob(blob)
  const fallback = `proposta_${budgetNumber}_${projectName.replace(/\s+/g, '_').toLowerCase()}.pdf`
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), fallback)
  triggerBrowserDownload(blob, filename)
}
