import type { BudgetProposalData } from '../src/pdf/types.ts'

const MAX_REMOTE_IMAGE_BYTES = 450_000
const MAX_WIDTH = 900
const JPEG_QUALITY = 72

type SharpFactory = typeof import('sharp')

async function loadSharp(): Promise<SharpFactory | null> {
  try {
    const mod = await import('sharp')
    return mod.default as unknown as SharpFactory
  } catch (error) {
    console.warn('[pdf] sharp indisponível — usando imagens sem redimensionar:', error)
    return null
  }
}

async function urlToDataUrl(url: string): Promise<string | undefined> {
  if (url.startsWith('data:')) return url

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) return undefined

    const input = Buffer.from(await response.arrayBuffer())
    if (input.length === 0) return undefined

    const sharp = await loadSharp()
    if (sharp) {
      const output = await sharp(input)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer()
      return `data:image/jpeg;base64,${output.toString('base64')}`
    }

    if (input.length > MAX_REMOTE_IMAGE_BYTES) {
      console.warn(`[pdf] Imagem remota ignorada (${input.length} bytes): ${url}`)
      return undefined
    }

    const mime = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
    return `data:${mime};base64,${input.toString('base64')}`
  } catch (error) {
    console.warn('[pdf] Falha ao embutir imagem remota:', url, error)
    return undefined
  }
}

/** Converte URLs remotas em data URL leve para o Puppeteer renderizar offline. */
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
    } else if (env.imageUrl && !env.imageUrl.startsWith('data:')) {
      env.imageUrl = undefined
    }
  }
}
