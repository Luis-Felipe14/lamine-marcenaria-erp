import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import puppeteer from 'puppeteer'

if (process.env.SKIP_PUPPETEER_INSTALL === 'true' || process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
  console.log('[puppeteer] Instalação do Chrome ignorada (usando Chromium do sistema)')
  process.exit(0)
}

const executable = puppeteer.executablePath()

if (executable && existsSync(executable)) {
  console.log('[puppeteer] Chrome já disponível:', executable)
  process.exit(0)
}

console.log('[puppeteer] Instalando Chrome para geração de PDF...')
const result = spawnSync('npx', ['puppeteer', 'browsers', 'install', 'chrome'], {
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 1)
