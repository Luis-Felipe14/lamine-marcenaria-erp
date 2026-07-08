import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { closePdfBrowser, handleBudgetPdfRequest, warmPdfBrowser } from './budget-pdf-handler.ts'

const PORT = Number(process.env.PDF_SERVER_PORT ?? 3001)
const APP_URL = process.env.VITE_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'

const app = express()
app.use(cors({ origin: [APP_URL, 'http://localhost:3000'], credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
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

server.listen(PORT, () => {
  console.log(`PDF server rodando em http://localhost:${PORT}`)
  console.log('Mantenha este terminal aberto. Pressione Ctrl+C para encerrar.')
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
