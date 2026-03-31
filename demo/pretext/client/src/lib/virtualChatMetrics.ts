import { layout, prepare } from '@chenglou/pretext'
import { PRETEXT_LINE_HEIGHT_PX, PRETEXT_MESSAGE_FONT } from './pretextFont'

/** 与 App.vue / PretextMessage 中气泡、列表样式保持同步（用于虚拟高度，避免读 DOM） */
export const LIST_GAP_Y = 16
export const ROW_META_H = 24
export const ROW_META_TO_BUBBLE_GAP = 6
export const BUBBLE_PAD_Y = 20
export const BUBBLE_PAD_X = 24

/** meta + 间距 + 气泡上下 padding */
export const ROW_CHROME_Y = ROW_META_H + ROW_META_TO_BUBBLE_GAP + BUBBLE_PAD_Y

export function innerWidthsFromViewport(viewportCssWidth: number): {
  assistant: number
  user: number
} {
  const w = Math.max(0, Math.floor(viewportCssWidth))
  const listPadX = 12
  const assistantOuter = Math.max(0, w - listPadX)
  const userOuter = Math.min(Math.floor(assistantOuter * 0.92), 640)
  return {
    assistant: Math.max(40, assistantOuter - BUBBLE_PAD_X),
    user: Math.max(40, userOuter - BUBBLE_PAD_X)
  }
}

export function pretextContentHeight(
  text: string,
  innerWidth: number,
  whiteSpace: 'normal' | 'pre-wrap'
): number {
  const iw = Math.max(1, Math.floor(innerWidth))
  if (!text) return 0
  const prepared = prepare(text, PRETEXT_MESSAGE_FONT, { whiteSpace })
  const { height } = layout(prepared, iw, PRETEXT_LINE_HEIGHT_PX)
  return height
}

export function messageRowHeight(opts: {
  role: 'user' | 'assistant'
  content: string
  innerW: number
  whiteSpace: 'normal' | 'pre-wrap'
  /** 仅对助手且内容为空：占位一行高度（输入中） */
  emptyAssistantPlaceholder: boolean
}): number {
  const { role, content, innerW, whiteSpace, emptyAssistantPlaceholder } = opts
  let body = pretextContentHeight(content, innerW, whiteSpace)
  if (role === 'assistant' && !content && emptyAssistantPlaceholder) {
    body = PRETEXT_LINE_HEIGHT_PX
  }
  return ROW_CHROME_Y + body
}

/** 前缀顶 offset：offsets[i] = 第 i 条消息顶部距离内容区顶部的距离 */
export function buildOffsets(heights: number[]): { offsets: number[]; totalHeight: number } {
  const offsets: number[] = []
  let y = 0
  for (let i = 0; i < heights.length; i++) {
    offsets.push(y)
    y += heights[i]
    if (i < heights.length - 1) y += LIST_GAP_Y
  }
  return { offsets, totalHeight: y }
}
