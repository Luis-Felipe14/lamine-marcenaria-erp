import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

/** Limite de segurança; assets em public/pdf/ já vêm otimizados (~25–40KB). */
const MAX_BRAND_ASSET_BYTES = 300_000

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

/**
 * Assets da marca para o PDF.
 * Preferir public/pdf/* (otimizados) para caber no Render free sem perder o visual.
 */
export function resolveProposalBrandAssets(): {
  logoUrl?: string
  headerImageUrl?: string
} {
  if (cachedBrandAssets) return cachedBrandAssets

  cachedBrandAssets = {
    logoUrl: loadLocalPdfAssetDataUrl(
      'pdf/lamine-logo.png',
      'lamine-logo.svg',
      'lamine-monogram.svg',
    ),
    headerImageUrl: loadLocalPdfAssetDataUrl(
      'pdf/lamine-header.jpg',
      'lamine-background.png',
      'login/slide-1.svg',
    ),
  }

  return cachedBrandAssets
}
