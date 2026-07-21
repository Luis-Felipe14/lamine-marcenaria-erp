/**
 * Gera versões leves do logo/fundo só para o PDF (plano free do Render).
 * Mantém o visual da marca sem estourar 512MB de RAM.
 * Uso: node scripts/generate-pdf-assets.mjs
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'pdf')

await mkdir(outDir, { recursive: true })

const logoSrc = join(root, 'public', 'lamine-logo.png')
const bgSrc = join(root, 'public', 'lamine-background.png')
const monogramSrc = join(root, 'public', 'lamine-monogram.png')

await sharp(logoSrc)
  .resize({ width: 720, withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true, quality: 80 })
  .toFile(join(outDir, 'lamine-logo.png'))

await sharp(bgSrc)
  .resize({ width: 1200, withoutEnlargement: true })
  .jpeg({ quality: 72, mozjpeg: true })
  .toFile(join(outDir, 'lamine-header.jpg'))

// Monograma: remove fundo preto e gera PNG leve com transparência
{
  const { data, info } = await sharp(monogramSrc)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 48 && data[i + 1] < 48 && data[i + 2] < 48) {
      data[i + 3] = 0
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize({ width: 160, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, 'lamine-monogram.png'))
}

console.log('Assets de PDF gerados em public/pdf/ (logo + header + monograma)')
