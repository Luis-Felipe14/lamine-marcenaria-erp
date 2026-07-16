import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { closePdfBrowser, handleBudgetPdfRequest, warmPdfBrowser } from './budget-pdf-handler.ts'

const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = Number(process.env.PORT ?? process.env.PDF_SERVER_PORT ?? 3001)
const APP_URL = process.env.VITE_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '')
}

const corsOrigins = [
  APP_URL,
  'http://localhost:3000',
  // Origem de produção (fallback se VITE_APP_URL/CORS_ORIGINS estiver ausente ou com barra final)
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

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Alias usado pelo frontend/proxy Cloudflare ao acordar o servidor
app.get('/api/pdf/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/pdf/budget/:budgetId', async (req, res) => {
  const result = await handleBudgetPdfRequest(req.params.budgetId, req.headers.authorization)
  res.status(result.status)
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value)
  }
  res.send(result.body)
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
  void warmPdfBrowser()
})

if (process.stdin.isTTY) {
  process.stdin.resume()
}

async function shutdown() {
  await closePdfBrowser().catch(() => undefined)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => {
  void shutdown()
})

process.on('SIGTERM', () => {
  void shutdown()
})
