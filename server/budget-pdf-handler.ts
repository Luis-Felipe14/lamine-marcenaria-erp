import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import puppeteer, { type Browser } from 'puppeteer'
import { loadBudgetProposalData } from '../src/pdf/load-budget-proposal.ts'
import { renderProposalHtml } from '../src/pdf/render-proposal-html.tsx'
import { embedProposalRemoteImages } from './pdf-image-embed.ts'
import { resolveProposalBrandAssets } from './pdf-assets.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const proposalCss = readFileSync(
  path.resolve(__dirname, '../src/pdf/styles/premium-proposal.css'),
  'utf-8',
)

let browserInstance: Browser | null = null
let browserLaunchPromise: Promise<Browser> | null = null

function formatPdfServerError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null) {
    const record = error as { message?: string; details?: string; hint?: string }
    if (record.message) {
      return [record.message, record.details, record.hint].filter(Boolean).join(' — ')
    }
  }
  return 'Erro ao gerar PDF'
}

function getEnv() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const appUrl = process.env.VITE_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env')
  }

  return { supabaseUrl, supabaseAnonKey, appUrl }
}

function createAuthedSupabase(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv()
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function resolveChromeExecutable(): string {
  const bundled = puppeteer.executablePath()
  if (bundled && existsSync(bundled)) return bundled

  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : undefined,
  ].filter((value): value is string => Boolean(value))

  const found = candidates.find((candidate) => existsSync(candidate))
  if (found) return found

  throw new Error(
    'Chrome não encontrado para gerar PDF. Rode no terminal: npm run pdf:install-browser',
  )
}

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance

  if (!browserLaunchPromise) {
    const executablePath = resolveChromeExecutable()
    browserLaunchPromise = puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    }).then((browser) => {
      browserInstance = browser
      browser.on('disconnected', () => {
        browserInstance = null
        browserLaunchPromise = null
      })
      return browser
    }).catch((error) => {
      browserLaunchPromise = null
      throw error
    })
  }

  return browserLaunchPromise
}

/** Pré-aquece Chromium e assets na subida do servidor. */
export async function warmPdfBrowser(): Promise<void> {
  try {
    resolveProposalBrandAssets()
    await getBrowser()
    console.log('[pdf] Chromium aquecido e pronto')
  } catch (error) {
    console.warn('[pdf] Não foi possível pré-aquecer o Chromium:', formatPdfServerError(error))
  }
}

export async function closePdfBrowser(): Promise<void> {
  const browser = browserInstance
  browserInstance = null
  browserLaunchPromise = null
  if (browser?.connected) await browser.close()
}

export async function generateBudgetPdfBuffer(
  budgetId: string,
  accessToken: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const startedAt = Date.now()
  const { appUrl } = getEnv()
  const supabase = createAuthedSupabase(accessToken)
  const data = await loadBudgetProposalData(supabase, budgetId, { baseUrl: appUrl })

  const brandAssets = resolveProposalBrandAssets()
  if (brandAssets.logoUrl) data.company.logoUrl = brandAssets.logoUrl
  if (brandAssets.headerImageUrl) data.company.headerImageUrl = brandAssets.headerImageUrl

  await embedProposalRemoteImages(data)

  const html = renderProposalHtml(data, proposalCss)
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // Assets já vão embutidos como data URL; bloqueia fonts externas para não esperar rede
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const resourceType = request.resourceType()
      const url = request.url()
      if (
        resourceType === 'font'
        || url.includes('fonts.googleapis.com')
        || url.includes('fonts.gstatic.com')
      ) {
        void request.abort()
        return
      }
      void request.continue()
    })

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await page.emulateMediaType('print')

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    const filename = `proposta_${data.budget.number}_${data.budget.projectName.replace(/\s+/g, '_').toLowerCase()}.pdf`
    console.log(`[pdf] Orçamento ${budgetId} gerado em ${Date.now() - startedAt}ms`)
    return { buffer: Buffer.from(pdf), filename }
  } finally {
    await page.close().catch(() => undefined)
  }
}

export async function handleBudgetPdfRequest(
  budgetId: string,
  authorizationHeader: string | undefined,
): Promise<{ status: number; headers: Record<string, string>; body: Buffer | string }> {
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice(7)
    : null

  if (!token) {
    return {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Token de autenticação obrigatório' }),
    }
  }

  try {
    const { buffer, filename } = await generateBudgetPdfBuffer(budgetId, token)
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: buffer,
    }
  } catch (error) {
    const message = formatPdfServerError(error)
    console.error('[pdf]', message, error)
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    }
  }
}
