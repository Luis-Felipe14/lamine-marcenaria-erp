/**
 * Gera ícones PWA quadrados a partir do monograma da marca.
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
const monogram = join(root, 'public', 'lamine-monogram.png')

const BG = { r: 10, g: 10, b: 10, alpha: 1 }

async function makeIcon(size, logoScale, filename) {
  const logoSize = Math.round(size * logoScale)
  const logoBuf = await sharp(monogram)
    .resize(logoSize, logoSize, { fit: 'contain', background: BG })
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(join(outDir, filename))
}

await mkdir(outDir, { recursive: true })
await readFile(monogram)

await makeIcon(192, 0.72, 'pwa-192.png')
await makeIcon(512, 0.68, 'pwa-512.png')
await makeIcon(512, 0.56, 'pwa-maskable-512.png')

console.log('Ícones PWA gerados em public/icons/')
