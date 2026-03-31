<script setup lang="ts">
import { prepareWithSegments, layoutWithLines, type PreparedTextWithSegments } from '@chenglou/pretext'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { PRETEXT_LINE_HEIGHT_PX, PRETEXT_MESSAGE_FONT } from '../lib/pretextFont'

const props = defineProps<{
  text: string
  whiteSpace?: 'normal' | 'pre-wrap'
  /** 与虚拟列表 Pretext 预估宽度一致时传入，可省略 ResizeObserver */
  fixedContentWidth?: number
}>()

const rootEl = ref<HTMLElement | null>(null)
const widthPx = ref(280)
let ro: ResizeObserver | null = null

const useFixedWidth = computed(
  () => typeof props.fixedContentWidth === 'number' && props.fixedContentWidth > 0
)

function applyMeasuredWidth() {
  if (useFixedWidth.value) {
    widthPx.value = Math.floor(props.fixedContentWidth!)
    return
  }
  const el = rootEl.value
  if (!el) return
  const w = el.getBoundingClientRect().width
  if (w > 0) widthPx.value = Math.floor(w)
}

watch(
  () => props.fixedContentWidth,
  () => applyMeasuredWidth(),
  { immediate: true }
)

onMounted(() => {
  applyMeasuredWidth()
  if (useFixedWidth.value) return
  const el = rootEl.value
  if (!el) return
  ro = new ResizeObserver(() => applyMeasuredWidth())
  ro.observe(el)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

const prepared = shallowRef<PreparedTextWithSegments | null>(null)

function runPrepare(t: string) {
  if (!t) {
    prepared.value = null
    return
  }
  prepared.value = prepareWithSegments(t, PRETEXT_MESSAGE_FONT, {
    whiteSpace: props.whiteSpace ?? 'normal'
  })
}

let raf = 0
watch(
  () => [props.text, props.whiteSpace] as const,
  ([t]) => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => runPrepare(t))
  },
  { immediate: true }
)

onBeforeUnmount(() => cancelAnimationFrame(raf))

const layout = computed(() => {
  const p = prepared.value
  const w = widthPx.value
  if (!p || w <= 0) {
    return { height: 0, lineCount: 0, lines: [] as Array<{ text: string; width: number }> }
  }
  const { height, lineCount, lines } = layoutWithLines(p, w, PRETEXT_LINE_HEIGHT_PX)
  return { height, lineCount, lines }
})
</script>

<template>
  <div
    ref="rootEl"
    class="pretext-root"
    :style="{ font: PRETEXT_MESSAGE_FONT }"
  >
    <div
      class="pretext-lines"
      :style="{ minHeight: layout.height ? `${layout.height}px` : undefined }"
      aria-live="polite"
    >
      <div
        v-for="(line, i) in layout.lines"
        :key="i"
        class="pretext-line"
        :style="{ lineHeight: `${PRETEXT_LINE_HEIGHT_PX}px`, height: `${PRETEXT_LINE_HEIGHT_PX}px` }"
      >
        {{ line.text.length ? line.text : '\u00a0' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.pretext-root {
  width: 100%;
  min-width: 0;
  word-break: normal;
  overflow-wrap: break-word;
  line-break: auto;
}

.pretext-lines {
  display: block;
}

.pretext-line {
  white-space: pre;
  overflow: hidden;
}
</style>
