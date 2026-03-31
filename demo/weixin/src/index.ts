import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const qrcodeTerminal = require('qrcode-terminal') as {
  generate: (text: string, opts: { small: boolean }, cb: (qr: string) => void) => void
}
import { clearToken, loadToken, saveToken, type TokenStore } from './auth.js'
import { askAI } from './ai.js'
import { getQRCode, getQRStatus, getUpdates, sendTextMessage } from './ilink.js'

// ── 工具 ────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function log(tag: string, msg: string) {
  const time = new Date().toLocaleTimeString('zh-CN')
  console.log(`[${time}] [${tag}] ${msg}`)
}

// ── 登录流程 ─────────────────────────────────────────────────

async function login(): Promise<TokenStore> {
  log('login', '正在获取二维码...')

  const { qrcode, qrcode_img_content } = await getQRCode()

  // qrcode_img_content 实际上是一个扫码 URL，用 qrcode-terminal 渲染到终端
  const scanUrl = qrcode_img_content

  console.log('\n' + '─'.repeat(52))
  console.log('  请用微信扫描以下二维码，然后点击"确认登录"')
  console.log('─'.repeat(52))
  // 在终端中生成 ASCII 二维码（small=true 使用小号字符）
  await new Promise<void>((resolve) => {
    qrcodeTerminal.generate(scanUrl, { small: true }, (qr: string) => {
      console.log(qr)
      resolve()
    })
  })
  console.log('  扫码链接：' + scanUrl)
  console.log('─'.repeat(52) + '\n')

  // 轮询扫码状态
  while (true) {
    await sleep(2000)
    const status = await getQRStatus(qrcode)
    log('login', `扫码状态: ${status.status}`)

    if (status.status === 'confirmed' && status.bot_token && status.baseurl) {
      log('login', '✓ 扫码成功，已登录')
      return { bot_token: status.bot_token, baseurl: status.baseurl }
    }
    if (status.status === 'expired') {
      log('login', '二维码已过期，自动刷新...')
      throw new Error('qrcode_expired')
    }
  }
}

// ── Bot 主循环 ────────────────────────────────────────────────

async function botLoop(auth: TokenStore, watchFriendId: string | undefined) {
  let buf = ''
  // 记录正在处理中的消息，避免并发重复回复
  const processing = new Set<string>()

  log('bot', '开始监听消息，按 Ctrl+C 退出...')
  if (watchFriendId) {
    log('bot', `监听好友 ID：${watchFriendId}`)
  } else {
    log('bot', '⚠ 未设置 WATCH_FRIEND_ID，当前为【发现模式】——打印所有消息帮助你找到好友 ID')
  }

  while (true) {
    try {
      const result = await getUpdates(auth.bot_token, buf)
      log('bot', `getupdates result: ${JSON.stringify(result)}`)
      // ret 为 0 或 undefined 均视为成功；明确非 0 数字才是错误
      if (typeof result.ret === 'number' && result.ret !== 0) {
        log('bot', `getupdates ret=${result.ret}，可能 token 已失效，清除后重新登录...`)
        clearToken()
        throw new Error(`iLink ret=${result.ret}`)
      }

      buf = result.get_updates_buf ?? buf

      for (const msg of result.msgs ?? []) {
        // 只处理用户发来的消息（message_type=1）
        if (msg.message_type !== 1) continue

        const textItem = msg.item_list?.find((i) => i.type === 1)
        if (!textItem || textItem.type !== 1) {
          log('bot', `收到非文本消息 from=${msg.from_user_id}，跳过`)
          continue
        }

        const text = textItem.text_item.text
        const fromId = msg.from_user_id
        const ctxToken = msg.context_token

        // 发现模式：打印所有消息
        if (!watchFriendId) {
          log('发现', `from=${fromId} | ${text}`)
          log('发现', `→ 如果这是你想监听的好友，在 .env 中设置：WATCH_FRIEND_ID=${fromId}`)
          continue
        }

        log('发现', `from=${fromId} | ${text}`)
        log('发现', `watchFriendId: ${watchFriendId}`)

        // 只处理指定好友的消息
        if (fromId !== watchFriendId) continue

        const dedupeKey = `${ctxToken}_${text.slice(0, 20)}`
        if (processing.has(dedupeKey)) continue
        processing.add(dedupeKey)

        log('消息', `"${text}"`)
        log('AI', '正在生成回复...')

        // 异步处理，不阻塞主循环
        void (async () => {
          try {
            const reply = await askAI(text)
            log('AI', `回复："${reply}"`)
            await sendTextMessage(auth.bot_token, fromId, reply, ctxToken)
            log('bot', '✓ 回复已发送')
          } catch (e) {
            log('错误', `处理消息失败: ${String(e)}`)
          } finally {
            processing.delete(dedupeKey)
          }
        })()
      }
    } catch (e) {
      const msg = String(e)
      // token 失效，向外抛出让 main 重新登录
      if (msg.includes('iLink ret=') || msg.includes('401')) throw e
      log('错误', `getupdates 异常: ${msg}，5 秒后重试...`)
      await sleep(5000)
    }
  }
}

// ── 入口 ─────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('╔════════════════════════════════════════╗')
  console.log('║       微信 AI Bot  (iLink 协议)        ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('')

  const watchFriendId = process.env.WATCH_FRIEND_ID?.trim() || undefined

  // 自动重试登录循环（token 失效时重新扫码）
  while (true) {
    let auth = loadToken()

    if (!auth) {
      log('auth', '未找到已保存的 token，需要扫码登录')
      try {
        auth = await login()
        saveToken(auth)
      } catch (e) {
        const msg = String(e)
        // 二维码过期时静默刷新，其他错误短暂等待后重试
        if (!msg.includes('qrcode_expired')) {
          log('auth', `登录失败: ${msg}`)
          await sleep(3000)
        }
        continue
      }
    } else {
      log('auth', '✓ 使用已保存的 token')
    }

    try {
      await botLoop(auth, watchFriendId)
    } catch (e) {
      log('main', `Bot 退出，原因: ${String(e)}，准备重新登录...`)
      clearToken()
      await sleep(2000)
    }
  }
}

main().catch((e) => {
  console.error('致命错误:', e)
  process.exit(1)
})
