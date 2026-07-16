import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import puppeteer, { type Browser } from 'puppeteer'
import ws from 'ws'
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
let pdfQueue: Promise<unknown> = Promise.resolve()

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
    realtime: {
      transport: ws,
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

const LOW_MEMORY_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--font-render-hinting=none',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-domain-reliability',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-zygote',
  '--single-process',
  '--js-flags=--max-old-space-size=128',
]

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance

  if (!browserLaunchPromise) {
    const executablePath = resolveChromeExecutable()
    browserLaunchPromise = puppeteer.launch({
      headless: true,
      executablePath,
      args: LOW_MEMORY_CHROME_ARGS,
      // Reduz footprint no plano free (512MB)
      dumpio: false,
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

/** No plano free, não mantém Chromium residente — só valida assets. */
export async function warmPdfBrowser(): Promise<void> {
  try {
    resolveProposalBrandAssets()
    console.log('[pdf] Assets de marca carregados (Chromium sob demanda)')
  } catch (error) {
    console.warn('[pdf] Não foi possível carregar assets:', formatPdfServerError(error))
  }
}

export async function closePdfBrowser(): Promise<void> {
  const browser = browserInstance
  browserInstance = null
  browserLaunchPromise = null
  if (browser?.connected) await browser.close()
}

async function generateBudgetPdfBufferOnce(
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
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 })
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const resourceType = request.resourceType()
      const url = request.url()
      if (
        resourceType === 'font'
        || resourceType === 'media'
        || resourceType === 'websocket'
        || url.includes('fonts.googleapis.com')
        || url.includes('fonts.gstatic.com')
        || (resourceType === 'image' && !url.startsWith('data:'))
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
    // Libera RAM entre requisições no Render free
    await closePdfBrowser().catch(() => undefined)
  }
}

/** Serializa gerações — evita 2 Chromiums ao mesmo tempo no free tier. */
export async function generateBudgetPdfBuffer(
  budgetId: string,
  accessToken: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const run = pdfQueue.then(() => generateBudgetPdfBufferOnce(budgetId, accessToken))
  pdfQueue = run.then(() => undefined, () => undefined)
  return run
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
    const isOom = /out of memory|ENOMEM|Cannot allocate/i.test(message)
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: isOom
          ? 'Servidor de PDF sem memória. Tente novamente em alguns segundos ou reduza imagens do orçamento.'
          : message,
      }),
    }
  }
}
