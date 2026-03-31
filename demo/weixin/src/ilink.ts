/**
 * 腾讯 iLink Bot API 客户端
 * 文档参考：https://github.com/hao-ji-xing/openclaw-weixin/blob/main/weixin-bot-api.md
 */

const BASE_URL = process.env.ILINK_BASE_URL || 'https://ilinkai.weixin.qq.com'

/** 每次请求生成随机 X-WECHAT-UIN */
function makeHeaders(token?: string): Record<string, string> {
  const uin = Math.floor(Math.random() * 0xffffffff)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    AuthorizationType: 'ilink_bot_token',
    'X-WECHAT-UIN': Buffer.from(String(uin)).toString('base64'),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function get<T>(urlPath: string, token?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    headers: makeHeaders(token),
  })
  if (!res.ok) {
    throw new Error(`GET ${urlPath} → HTTP ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<T>
}

async function post<T>(urlPath: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: 'POST',
    headers: makeHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`POST ${urlPath} → HTTP ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<T>
}

// ── 类型定义 ────────────────────────────────────────────────

export interface QRCodeResult {
  ret?: number
  qrcode: string
  qrcode_img_content: string  // base64 编码的 PNG 图片
}

export interface QRStatusResult {
  ret?: number
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired'
  bot_token?: string
  baseurl?: string
}

export interface WeixinTextItem {
  type: 1
  text_item: { text: string }
}

export interface WeixinMediaItem {
  type: 2 | 3 | 4 | 5
  [key: string]: unknown
}

export type WeixinItem = WeixinTextItem | WeixinMediaItem

export interface WeixinMessage {
  /** 消息来源：用户 ID（xxx@im.wechat）或群 ID */
  from_user_id: string
  /** 消息目标：Bot ID（xxx@im.bot） */
  to_user_id: string
  /** 1 = 用户发送，2 = Bot 发送 */
  message_type: number
  /** 2 = FINISH（完整消息） */
  message_state: number
  /** 对话关联 token，回复时必须原样带上 */
  context_token: string
  item_list: WeixinItem[]
}

export interface GetUpdatesResult {
  ret?: number
  msgs?: WeixinMessage[]
  /** 下次请求必须带上的游标 */
  get_updates_buf: string
  longpolling_timeout_ms?: number
}

// ── API 调用 ─────────────────────────────────────────────────

/** 获取登录二维码 */
export async function getQRCode(): Promise<QRCodeResult> {
  return get<QRCodeResult>('/ilink/bot/get_bot_qrcode?bot_type=3')
}

/** 轮询扫码状态 */
export async function getQRStatus(qrcode: string): Promise<QRStatusResult> {
  return get<QRStatusResult>(`/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`)
}

/** 长轮询收取新消息（服务器最多 hold 35 秒） */
export async function getUpdates(token: string, buf: string): Promise<GetUpdatesResult> {
  return post<GetUpdatesResult>(
    '/ilink/bot/getupdates',
    { get_updates_buf: buf, base_info: { channel_version: '1.0.2' } },
    token,
  )
}

/** 向指定用户发送文本消息（必须带 context_token 才能关联到对话窗口） */
export async function sendTextMessage(
  token: string,
  toUserId: string,
  text: string,
  contextToken: string,
): Promise<void> {
  await post(
    '/ilink/bot/sendmessage',
    {
      msg: {
        to_user_id: toUserId,
        message_type: 2,
        message_state: 2,
        context_token: contextToken,
        item_list: [{ type: 1, text_item: { text } }],
      },
    },
    token,
  )
}
