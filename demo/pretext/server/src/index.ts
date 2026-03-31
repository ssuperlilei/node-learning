import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'node:http'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = Number(process.env.PORT) || 3780

app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

function sseWrite(res: express.Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

async function* streamOpenAI(messages: ChatMessage[], model: string): AsyncGenerator<string, void, unknown> {
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim()
  const openaiKey = process.env.OPENAI_API_KEY?.trim()
  const key = openrouterKey || openaiKey
  console.log(key, 1)
  const useOpenRouter = Boolean(openrouterKey)

  let base =
    (useOpenRouter ? process.env.OPENROUTER_BASE_URL : process.env.OPENAI_BASE_URL)?.replace(/\/$/, '') ??
    (useOpenRouter ? 'https://openrouter.ai/api' : 'https://api.openai.com/v1')

  if (useOpenRouter && /\/api$/u.test(base)) {
    base = `${base}/v1`
  }

  const defaultModel = useOpenRouter
    ? process.env.OPENROUTER_MODEL || 'openrouter/free'
    : process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!key) {
    console.log(key, 2)
    const last = messages.filter((m) => m.role !== 'system').at(-1)?.content ?? ''
    const echo = `[演示模式，未配置密钥] 已收到：${last.slice(0, 200)}${last.length > 200 ? '…' : ''}\n\n（在 server/.env 中填写 OPENROUTER_API_KEY，或仅使用 OpenAI 时填写 OPENAI_API_KEY。）`
    for (const ch of echo) {
      yield ch
      await new Promise((r) => setTimeout(r, 8))
    }
    return
  }

  const body = {
    model: model || defaultModel,
    messages,
    stream: true,
    temperature: 0.7,
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  if (useOpenRouter) {
    const referer = process.env.OPENROUTER_HTTP_REFERER?.trim()
    const title = process.env.OPENROUTER_APP_TITLE?.trim()
    if (referer) headers['HTTP-Referer'] = referer
    if (title) headers['X-Title'] = title
  }

  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(errText || `OpenAI HTTP ${resp.status}`)
  }

  const reader = resp.body?.getReader()
  if (!reader) throw new Error('No response body')

  const dec = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n')
    buf = parts.pop() ?? ''
    for (const line of parts) {
      const t = line.replace(/^\s*data:\s*/, '').trim()
      if (!t || t === '[DONE]') continue
      try {
        const json = JSON.parse(t) as {
          choices?: Array<{ delta?: { content?: string | null } }>
        }
        const piece = json.choices?.[0]?.delta?.content
        if (piece) yield piece
      } catch {
        /* skip malformed sse line */
      }
    }
  }
}

app.post('/api/chat', async (req, res) => {
  const messages = req.body?.messages as ChatMessage[] | undefined
  const model = (req.body?.model as string | undefined) ?? ''

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages required' })
    return
  }

  const normalized = messages.map((m) => ({
    role: m.role,
    content: String(m.content ?? ''),
  }))

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  try {
    for await (const delta of streamOpenAI(normalized, model)) {
      sseWrite(res, 'delta', { delta })
    }
    sseWrite(res, 'done', {})
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    sseWrite(res, 'error', { message: msg })
  } finally {
    res.end()
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

httpServer.listen(PORT, () => {
  console.log(`pretext chat server http://localhost:${PORT}`)
})
