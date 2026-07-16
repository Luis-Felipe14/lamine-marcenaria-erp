/**
 * Proxy same-origin de /api/pdf/* → servidor Puppeteer (Render).
 * Elimina CORS no browser; o Service Worker não precisa tocar nessa rota.
 */
export interface Env {
  ASSETS: Fetcher
  PDF_UPSTREAM_URL?: string
}

const DEFAULT_PDF_UPSTREAM = 'https://lamine-pdf.onrender.com'

function upstreamBase(env: Env): string {
  return (env.PDF_UPSTREAM_URL || DEFAULT_PDF_UPSTREAM).replace(/\/$/, '')
}

function buildUpstreamHeaders(request: Request): Headers {
  const headers = new Headers()
  const authorization = request.headers.get('Authorization')
  if (authorization) headers.set('Authorization', authorization)
  const accept = request.headers.get('Accept')
  if (accept) headers.set('Accept', accept)
  const contentType = request.headers.get('Content-Type')
  if (contentType) headers.set('Content-Type', contentType)
  return headers
}

async function proxyToUpstream(
  request: Request,
  target: string,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const upstream = await fetch(target, {
        method: request.method,
        headers: buildUpstreamHeaders(request),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      })

      const responseHeaders = new Headers(upstream.headers)
      responseHeaders.delete('access-control-allow-origin')
      responseHeaders.delete('access-control-allow-credentials')
      responseHeaders.set('cache-control', 'no-store')

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      })
    } catch (error) {
      lastError = error
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Falha ao contactar servidor de PDF'
  return Response.json(
    {
      error: `Servidor de PDF indisponível (${message}). Aguarde ~30s se o Render estiver acordando e tente de novo.`,
    },
    { status: 502 },
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/pdf/')) {
      const base = upstreamBase(env)

      // Health do upstream (para o frontend acordar o Render free antes do PDF)
      if (url.pathname === '/api/pdf/health') {
        return proxyToUpstream(request, `${base}/health`)
      }

      const target = `${base}${url.pathname}${url.search}`
      return proxyToUpstream(request, target)
    }

    return env.ASSETS.fetch(request)
  },
}
