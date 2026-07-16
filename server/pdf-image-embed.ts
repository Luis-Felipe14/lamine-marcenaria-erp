import type { BudgetProposalData } from '../src/pdf/types.ts'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** Evita embutir fotos enormes que estouram a RAM do Render free. */
const MAX_REMOTE_IMAGE_BYTES = 400_000

function guessMime(url: string, headerMime: string | null): string {
  if (headerMime?.startsWith('image/')) return headerMime.split(';')[0]
  const ext = url.split('?')[0].match(/\.[a-z0-9]+$/i)?.[0].toLowerCase()
  return ext ? (MIME_BY_EXT[ext] ?? 'image/jpeg') : 'image/jpeg'
}

async function urlToDataUrl(url: string): Promise<string | undefined> {
  if (url.startsWith('data:')) return url

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) return undefined

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
      console.warn(`[pdf] Imagem remota ignorada (content-length ${contentLength}): ${url}`)
      return undefined
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) return undefined
    if (buffer.length > MAX_REMOTE_IMAGE_BYTES) {
      console.warn(`[pdf] Imagem remota ignorada (${buffer.length} bytes): ${url}`)
      return undefined
    }

    const mime = guessMime(url, response.headers.get('content-type'))
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return undefined
  }
}

/** Converte URLs remotas (ex.: Supabase Storage) em data URL para o Puppeteer renderizar offline. */
export async function embedProposalRemoteImages(data: BudgetProposalData): Promise<void> {
  const uniqueUrls = [...new Set(
    data.environments
      .map((env) => env.imageUrl)
      .filter((url): url is string => Boolean(url) && !url.startsWith('data:')),
  )]

  if (uniqueUrls.length === 0) return

  const embedded = await Promise.all(
    uniqueUrls.map(async (url) => ({ url, dataUrl: await urlToDataUrl(url) })),
  )

  const map = new Map(
    embedded
      .filter((entry): entry is { url: string; dataUrl: string } => Boolean(entry.dataUrl))
      .map((entry) => [entry.url, entry.dataUrl]),
  )

  for (const env of data.environments) {
    if (env.imageUrl && map.has(env.imageUrl)) {
      env.imageUrl = map.get(env.imageUrl)!
    } else if (env.imageUrl && !env.imageUrl.startsWith('data:') && !map.has(env.imageUrl)) {
      // Sem data URL: remove para o Chromium não baixar em runtime
      env.imageUrl = undefined
    }
  }
}
