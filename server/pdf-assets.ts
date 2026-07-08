import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

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

/** Assets da marca cacheados em memória (evita reler PNG grandes a cada PDF). */
export function resolveProposalBrandAssets(): {
  logoUrl?: string
  headerImageUrl?: string
} {
  if (cachedBrandAssets) return cachedBrandAssets

  cachedBrandAssets = {
    logoUrl: loadLocalPdfAssetDataUrl('lamine-logo.png', 'lamine-logo.svg'),
    headerImageUrl: loadLocalPdfAssetDataUrl(
      'lamine-background.png',
      'login-background.png',
      'login/slide-1.svg',
    ),
  }

  return cachedBrandAssets
}
