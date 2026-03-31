export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = { role: ChatRole; content: string }

function parseSseBlocks(chunk: string): Array<{ event: string; data: string }> {
  const out: Array<{ event: string; data: string }> = []
  const blocks = chunk.split(/\r?\n\r?\n/)
  for (const block of blocks) {
    if (!block.trim()) continue
    let event = 'message'
    let data = ''
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    if (data) out.push({ event, data })
  }
  return out
}

export async function streamChat(
  messages: ChatMessage[],
  opts: {
    model?: string
    onDelta: (s: string) => void
    onDone: () => void
    onError: (message: string) => void
    signal?: AbortSignal
  }
): Promise<void> {
  const { model, onDelta, onDone, onError, signal } = opts
  let resp: Response
  try {
    resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model }),
      signal
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      onDone()
      return
    }
    onError(e instanceof Error ? e.message : String(e))
    return
  }

  if (!resp.ok) {
    const t = await resp.text()
    onError(t || `HTTP ${resp.status}`)
    return
  }

  const reader = resp.body?.getReader()
  if (!reader) {
    onError('无法读取响应流')
    return
  }

  const dec = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += dec.decode(value, { stream: true })

      const parts = buffer.split(/\r?\n\r?\n/)
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const blocks = parseSseBlocks(part + '\n\n')
        for (const { event, data } of blocks) {
          if (event === 'delta') {
            try {
              const j = JSON.parse(data) as { delta?: string }
              if (j.delta) onDelta(j.delta)
            } catch {
              /* ignore */
            }
          } else if (event === 'done') {
            onDone()
            return
          } else if (event === 'error') {
            try {
              const j = JSON.parse(data) as { message?: string }
              onError(j.message ?? data)
            } catch {
              onError(data)
            }
            return
          }
        }
      }
    }

    const tail = parseSseBlocks(buffer.trim() ? buffer + '\n\n' : '')
    for (const { event, data } of tail) {
      if (event === 'delta') {
        try {
          const j = JSON.parse(data) as { delta?: string }
          if (j.delta) onDelta(j.delta)
        } catch {
          /* ignore */
        }
      } else if (event === 'error') {
        try {
          const j = JSON.parse(data) as { message?: string }
          onError(j.message ?? data)
        } catch {
          onError(data)
        }
        return
      }
    }
    onDone()
  } finally {
    reader.releaseLock()
  }
}
