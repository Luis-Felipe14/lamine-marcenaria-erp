import sharp from 'sharp'
import type { BudgetProposalData } from '../src/pdf/types.ts'

/** Fotos de ambiente comprimidas para o PDF (qualidade visual ok, RAM baixa). */
const MAX_WIDTH = 900
const JPEG_QUALITY = 72

async function urlToCompressedDataUrl(url: string): Promise<string | undefined> {
  if (url.startsWith('data:')) return url

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) return undefined

    const input = Buffer.from(await response.arrayBuffer())
    if (input.length === 0) return undefined

    const output = await sharp(input)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    return `data:image/jpeg;base64,${output.toString('base64')}`
  } catch (error) {
    console.warn('[pdf] Falha ao comprimir imagem remota:', url, error)
    return undefined
  }
}

/** Converte URLs remotas em JPEG leve (data URL) para o Puppeteer renderizar offline. */
export async function embedProposalRemoteImages(data: BudgetProposalData): Promise<void> {
  const uniqueUrls = [...new Set(
    data.environments
      .map((env) => env.imageUrl)
      .filter((url): url is string => Boolean(url) && !url.startsWith('data:')),
  )]

  if (uniqueUrls.length === 0) return

  const embedded = await Promise.all(
    uniqueUrls.map(async (url) => ({ url, dataUrl: await urlToCompressedDataUrl(url) })),
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
