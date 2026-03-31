<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PretextMessage from './PretextMessage.vue'
import {
  buildOffsets,
  innerWidthsFromViewport,
  messageRowHeight
} from '../lib/virtualChatMetrics'

export type ChatRow = { id: string; role: 'user' | 'assistant'; content: string }

const props = defineProps<{
  messages: ChatRow[]
  whiteSpace: 'normal' | 'pre-wrap'
  streaming: boolean
}>()

const emit = defineEmits<{
  copy: [text: string]
}>()

const scroller = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportH = ref(1)
const viewportW = ref(400)
const stickToBottom = ref(true)

const OVERSCAN = 4
const STICK_THRESHOLD = 96

let ro: ResizeObserver | null = null
let scrollRaf = 0

function updateViewportSize() {
  const el = scroller.value
  if (!el) return
  viewportH.value = Math.max(1, el.clientHeight)
  viewportW.value = Math.max(1, el.clientWidth)
}

onMounted(() => {
  updateViewportSize()
  const el = scroller.value
  if (!el) return
  ro = new ResizeObserver(() => updateViewportSize())
  ro.observe(el)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  cancelAnimationFrame(scrollRaf)
})

const innerW = computed(() => innerWidthsFromViewport(viewportW.value))

const heightCache = new Map<string, number>()
const HEIGHT_CACHE_MAX = 4096

function heightCacheKey(
  m: ChatRow,
  inner: number,
  ws: 'normal' | 'pre-wrap',
  streaming: boolean
) {
  const ph = streaming && m.role === 'assistant' && m.content === '' ? '1' : '0'
  return `${m.id}\0${ws}\0${inner}\0${m.content}\0${ph}`
}

const heights = computed(() => {
  const { assistant, user } = innerW.value
  const ws = props.whiteSpace
  const st = props.streaming
  return props.messages.map((m) => {
    const inner = m.role === 'user' ? user : assistant
    const key = heightCacheKey(m, inner, ws, st)
    const hit = heightCache.get(key)
    if (hit !== undefined) return hit
    const h = messageRowHeight({
      role: m.role,
      content: m.content,
      innerW: inner,
      whiteSpace: ws,
      emptyAssistantPlaceholder: st && m.role === 'assistant' && m.content === ''
    })
    heightCache.set(key, h)
    if (heightCache.size > HEIGHT_CACHE_MAX) heightCache.clear()
    return h
  })
})

watch(
  () => props.messages.length,
  (n) => {
    if (n === 0) heightCache.clear()
  }
)

const layoutPair = computed(() => buildOffsets(heights.value))
const offsets = computed(() => layoutPair.value.offsets)
const totalHeight = computed(() => layoutPair.value.totalHeight)

function firstVisibleIndex(): number {
  const y = scrollTop.value
  const off = offsets.value
  const h = heights.value
  const n = off.length
  if (n === 0) return 0
  let lo = 0
  let hi = n
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (off[mid]! + h[mid]! <= y) lo = mid + 1
    else hi = mid
  }
  return Math.min(Math.max(0, lo), n - 1)
}

function lastVisibleIndex(start: number): number {
  const y = scrollTop.value + viewportH.value
  const off = offsets.value
  const n = off.length
  let lo = start
  let hi = n
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (off[mid]! < y) lo = mid + 1
    else hi = mid
  }
  return Math.max(start, Math.min(n - 1, lo - 1))
}

const virtualWindow = computed(() => {
  void scrollTop.value
  void viewportH.value
  const n = props.messages.length
  if (n === 0) {
    return { start: 0, end: -1, translateY: 0, indices: [] as number[] }
  }
  const start = Math.max(0, firstVisibleIndex() - OVERSCAN)
  const end = Math.min(n - 1, lastVisibleIndex(start) + OVERSCAN)
  const translateY = offsets.value[start] ?? 0
  const indices: number[] = []
  for (let i = start; i <= end; i++) indices.push(i)
  return { start, end, translateY, indices }
})

function onScroll() {
  const el = scroller.value
  if (!el) return
  scrollTop.value = el.scrollTop
  const slack = el.scrollHeight - el.scrollTop - el.clientHeight
  stickToBottom.value = slack <= STICK_THRESHOLD
}

function applyScrollToBottom() {
  const el = scroller.value
  if (!el) return
  el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
  scrollTop.value = el.scrollTop
}

function scheduleScrollToBottomIfStuck() {
  cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    if (stickToBottom.value) applyScrollToBottom()
  })
}

watch(
  () => props.messages,
  () => scheduleScrollToBottomIfStuck(),
  { deep: true }
)

watch(
  () => [props.whiteSpace, props.streaming] as const,
  () => scheduleScrollToBottomIfStuck()
)

watch(totalHeight, () => scheduleScrollToBottomIfStuck())

watch(viewportW, () => scheduleScrollToBottomIfStuck())

function scrollToBottomForced() {
  stickToBottom.value = true
  nextTick(() => applyScrollToBottom())
}

defineExpose({ scrollToBottomForced, applyScrollToBottom })

function rowInnerW(role: 'user' | 'assistant') {
  return role === 'user' ? innerW.value.user : innerW.value.assistant
}

function rowLocalTop(i: number): number {
  return (offsets.value[i] ?? 0) - virtualWindow.value.translateY
}
</script>

<template>
  <div
    ref="scroller"
    class="vscroll"
    @scroll.passive="onScroll"
  >
    <div class="vscroll-phantom" :style="{ height: `${totalHeight}px` }">
      <div
        class="vscroll-shift"
        :style="{ transform: `translateY(${virtualWindow.translateY}px)` }"
      >
        <template v-if="messages.length === 0">
          <p class="empty">
            发送一条消息开始。列表为虚拟滚动；高度由 Pretext
            <code>prepare</code> + <code>layout</code> 预估。
          </p>
        </template>
        <article
          v-for="i in virtualWindow.indices"
          :key="messages[i]!.id"
          class="row"
          :data-role="messages[i]!.role"
          :style="{
            top: `${rowLocalTop(i)}px`,
            height: `${heights[i]}px`
          }"
        >
          <div class="meta">
            <span class="who">{{ messages[i]!.role === 'user' ? '你' : '助手' }}</span>
            <button
              v-if="messages[i]!.content"
              type="button"
              class="mini"
              @click="emit('copy', messages[i]!.content)"
            >
              复制
            </button>
          </div>
          <div class="bubble" :class="messages[i]!.role">
            <div class="bubble-fill">
              <PretextMessage
                :text="messages[i]!.content"
                :white-space="whiteSpace"
                :fixed-content-width="rowInnerW(messages[i]!.role)"
              />
              <span
                v-if="
                  messages[i]!.role === 'assistant' &&
                  streaming &&
                  messages[i]!.content === ''
                "
                class="typing"
              >
                …
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vscroll {
  flex: 1;
  overflow: auto;
  padding: 8px 4px 120px;
  position: relative;
}

.vscroll-phantom {
  position: relative;
  width: 100%;
}

.vscroll-shift {
  position: relative;
  width: 100%;
  min-height: 1px;
}

.empty {
  color: var(--muted);
  text-align: center;
  margin: 24px 8px;
  line-height: 1.6;
}

.empty code {
  font-size: 0.9em;
}

.row {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  height: 24px;
}

.who {
  font-size: 0.8rem;
  color: var(--muted);
}

.mini {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
}

.bubble {
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 10px 12px;
  max-width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.bubble-fill {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bubble.user {
  align-self: flex-end;
  background: var(--user-bg);
  max-width: min(92%, 640px);
}

.bubble.assistant {
  align-self: flex-start;
  background: var(--assistant-bg);
  max-width: 100%;
}

.typing {
  color: var(--muted);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0.35;
  }
}
</style>
