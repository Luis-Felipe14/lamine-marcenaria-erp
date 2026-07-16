import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

/** Limite para caber no plano free do Render (512MB). */
const MAX_BRAND_ASSET_BYTES = 250_000

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

let cachedBrandAssets: { logoUrl?: string; headerImageUrl?: string } | null = null

function fileToDataUrl(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined
  const size = statSync(filePath).size
  if (size > MAX_BRAND_ASSET_BYTES) {
    console.warn(`[pdf] Asset ignorado (muito grande: ${size} bytes): ${filePath}`)
    return undefined
  }
  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream'
  const buffer = readFileSync(filePath)
  return `data:${mime};base64,${buffer.toString('base64')}`
}

function loadLocalPdfAssetDataUrl(...candidates: string[]): string | undefined {
  for (const relative of candidates) {
    const absolute = path.resolve(publicDir, relative.replace(/^\//, ''))
    const dataUrl = fileToDataUrl(absolute)
    if (dataUrl) return dataUrl
  }
  return undefined
}

/** Assets da marca cacheados em memória (evita reler a cada PDF). Preferir SVG leve. */
export function resolveProposalBrandAssets(): {
  logoUrl?: string
  headerImageUrl?: string
} {
  if (cachedBrandAssets) return cachedBrandAssets

  cachedBrandAssets = {
    // SVG primeiro — lamine-logo.png tem ~1.7MB e estoura RAM no Render free
    logoUrl: loadLocalPdfAssetDataUrl('lamine-logo.svg', 'lamine-monogram.svg', 'lamine-logo.png'),
    headerImageUrl: loadLocalPdfAssetDataUrl(
      'login/slide-1.svg',
      'lamine-background.png',
      'login-background.png',
    ),
  }

  return cachedBrandAssets
}
