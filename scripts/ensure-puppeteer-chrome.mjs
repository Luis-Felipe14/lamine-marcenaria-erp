import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import puppeteer from 'puppeteer'

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
