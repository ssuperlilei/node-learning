type Message = { role: 'user' | 'assistant' | 'system'; content: string }

/**
 * 调用 AI（OpenRouter 或 OpenAI 兼容接口）生成回复。
 * 使用非流式接口，返回完整文本。
 */
export async function askAI(userText: string): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim()
  const openaiKey = process.env.OPENAI_API_KEY?.trim()
  const key = openrouterKey || openaiKey

  if (!key) {
    return `[未配置 AI 密钥] 收到消息：${userText}`
  }

  const useOpenRouter = Boolean(openrouterKey)
  let base =
    (useOpenRouter ? process.env.OPENROUTER_BASE_URL : process.env.OPENAI_BASE_URL)?.replace(
      /\/$/,
      '',
    ) ?? (useOpenRouter ? 'https://openrouter.ai/api' : 'https://api.openai.com/v1')

  if (useOpenRouter && /\/api$/u.test(base)) {
    base = `${base}/v1`
  }

  const model = useOpenRouter
    ? process.env.OPENROUTER_MODEL || 'openrouter/free'
    : process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const systemPrompt =
    process.env.AI_SYSTEM_PROMPT ||
    '你是一个友好的 AI 助手，请用简洁自然的中文回复，控制在 200 字以内。'

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userText },
  ]

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
  if (useOpenRouter) {
    const referer = process.env.OPENROUTER_HTTP_REFERER?.trim()
    const title = process.env.OPENROUTER_APP_TITLE?.trim()
    if (referer) headers['HTTP-Referer'] = referer
    if (title) headers['X-Title'] = title
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  })

  if (!res.ok) {
    throw new Error(`AI API HTTP ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message: string }
  }

  if (data.error) throw new Error(`AI 错误: ${data.error.message}`)

  return data.choices?.[0]?.message?.content?.trim() ?? '（AI 未返回内容）'
}
