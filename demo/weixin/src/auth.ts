import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE = path.resolve(__dirname, '..', 'weixin-bot-token.json')

export interface TokenStore {
  bot_token: string
  baseurl: string
}

/**
 * 加载已保存的 token。
 * 优先读取 .env 中的 BOT_TOKEN/BOT_BASEURL，
 * 其次读取本地 JSON 文件（上次登录自动保存的）。
 */
export function loadToken(): TokenStore | null {
  const envToken = process.env.BOT_TOKEN?.trim()
  const envBase = process.env.BOT_BASEURL?.trim()
  if (envToken && envBase) {
    return { bot_token: envToken, baseurl: envBase }
  }
  try {
    const raw = fs.readFileSync(TOKEN_FILE, 'utf-8')
    const data = JSON.parse(raw) as TokenStore
    if (data.bot_token && data.baseurl) return data
  } catch {
    // 文件不存在或解析失败，忽略
  }
  return null
}

/**
 * 将 token 保存到本地 JSON 文件，下次启动无需重新扫码。
 */
export function saveToken(store: TokenStore): void {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(store, null, 2), 'utf-8')
  console.log(`[auth] ✓ token 已保存 → ${TOKEN_FILE}`)
}

/**
 * 清除本地保存的 token（登录失效时调用）。
 */
export function clearToken(): void {
  try {
    fs.unlinkSync(TOKEN_FILE)
    console.log('[auth] token 已清除，下次启动需要重新扫码')
  } catch {
    // 文件本来就不存在，忽略
  }
}
