import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'

const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = Number(process.env.PORT ?? process.env.PDF_SERVER_PORT ?? 3001)
const APP_URL = process.env.VITE_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '')
}

const corsOrigins = [
  APP_URL,
  'http://localhost:3000',
  'https://lamine-marcenaria-erp.eliustech.workers.dev',
  ...(process.env.CORS_ORIGINS?.split(',') ?? []),
]
  .map(normalizeOrigin)
  .filter(Boolean)

const app = express()
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true)
      return
    }
    console.warn(`[pdf] CORS bloqueado para origem: ${origin}. Permitidas: ${corsOrigins.join(', ')}`)
    callback(null, false)
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

/** Health leve — sobe antes de carregar Puppeteer/React (evita timeout no Render). */
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.get('/api/pdf/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.get('/api/pdf/budget/:budgetId', async (req, res) => {
  try {
    const { handleBudgetPdfRequest } = await import('./budget-pdf-handler.ts')
    const result = await handleBudgetPdfRequest(req.params.budgetId, req.headers.authorization)
    res.status(result.status)
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value)
    }
    res.send(result.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar PDF'
    console.error('[pdf] falha na rota:', message, error)
    res.status(500).json({ error: message })
  }
})

const server = createServer(app)

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} já está em uso. Encerre o processo anterior ou defina PDF_SERVER_PORT.`)
  } else {
    console.error('Erro ao iniciar servidor PDF:', error.message)
  }
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`PDF server rodando em http://${HOST}:${PORT}`)
  console.log(`[pdf] CORS origins: ${corsOrigins.join(', ')}`)
  // Carrega assets em background sem bloquear o health check
  void import('./budget-pdf-handler.ts')
    .then((mod) => mod.warmPdfBrowser())
    .catch((error) => console.warn('[pdf] warm adiato falhou:', error))
})

if (process.stdin.isTTY) {
  process.stdin.resume()
}

async function shutdown() {
  try {
    const { closePdfBrowser } = await import('./budget-pdf-handler.ts')
    await closePdfBrowser().catch(() => undefined)
  } catch {
    // ignore
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})
