/**
 * Proxy same-origin de /api/pdf/* → servidor Puppeteer (Render).
 * Elimina CORS no browser; o Service Worker não precisa tocar nessa rota.
 */
export interface Env {
  ASSETS: Fetcher
  PDF_UPSTREAM_URL?: string
}

const DEFAULT_PDF_UPSTREAM = 'https://lamine-pdf.onrender.com'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/pdf/')) {
      const upstreamBase = (env.PDF_UPSTREAM_URL || DEFAULT_PDF_UPSTREAM).replace(/\/$/, '')
      const target = `${upstreamBase}${url.pathname}${url.search}`

      const headers = new Headers(request.headers)
      headers.delete('host')
      headers.delete('cf-connecting-ip')
      headers.delete('cf-ipcountry')
      headers.delete('cf-ray')
      headers.delete('cf-visitor')
      headers.delete('x-forwarded-proto')
      headers.delete('x-real-ip')

      let upstream: Response
      try {
        upstream = await fetch(target, {
          method: request.method,
          headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow',
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao contactar servidor de PDF'
        return Response.json(
          { error: `Servidor de PDF indisponível: ${message}. Tente novamente em alguns segundos.` },
          { status: 502 },
        )
      }

      const responseHeaders = new Headers(upstream.headers)
      // Same-origin: não precisa CORS; evita cache intermediário do PDF
      responseHeaders.delete('access-control-allow-origin')
      responseHeaders.delete('access-control-allow-credentials')
      responseHeaders.set('cache-control', 'no-store')

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      })
    }

    return env.ASSETS.fetch(request)
  },
}
