<script setup lang="ts">
import { computed, ref } from 'vue'
import { streamChat, type ChatMessage } from './api/streamChat'
import VirtualChatList from './components/VirtualChatList.vue'

type UiMessage = { id: string; role: 'user' | 'assistant'; content: string }

const messages = ref<UiMessage[]>([])
const draft = ref('')
const systemPrompt = ref('你是一个简洁、 helpful 的中文助手。')
const model = ref('')
const whiteSpace = ref<'normal' | 'pre-wrap'>('normal')
const showSettings = ref(false)
const streaming = ref(false)
const error = ref<string | null>(null)
const listRef = ref<InstanceType<typeof VirtualChatList> | null>(null)

let abort: AbortController | null = null

const canSend = computed(
  () => !streaming.value && draft.value.trim().length > 0
)

function scrollToBottomForced() {
  listRef.value?.scrollToBottomForced()
}

function pushUser(content: string) {
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content
  })
}

function pushAssistantPlaceholder() {
  const id = crypto.randomUUID()
  messages.value.push({ id, role: 'assistant', content: '' })
  return id
}

function patchAssistant(id: string, chunk: string) {
  const m = messages.value.find((x) => x.id === id)
  if (m) m.content += chunk
}

function buildPayload(): ChatMessage[] {
  const sys = systemPrompt.value.trim()
  const core: ChatMessage[] = sys
    ? [{ role: 'system', content: sys }]
    : []
  let list = messages.value
  const last = list[list.length - 1]
  if (last?.role === 'assistant' && last.content === '') {
    list = list.slice(0, -1)
  }
  for (const m of list) {
    core.push({ role: m.role, content: m.content })
  }
  return core
}

async function send() {
  const text = draft.value.trim()
  if (!text || streaming.value) return
  error.value = null
  draft.value = ''
  pushUser(text)
  scrollToBottomForced()
  const asstId = pushAssistantPlaceholder()
  streaming.value = true
  abort = new AbortController()

  await streamChat(buildPayload(), {
    model: model.value.trim() || undefined,
    signal: abort.signal,
    onDelta: (s) => patchAssistant(asstId, s),
    onDone: () => {
      streaming.value = false
      abort = null
      scrollToBottomForced()
    },
    onError: (msg) => {
      streaming.value = false
      abort = null
      error.value = msg
      patchAssistant(asstId, `\n\n[错误] ${msg}`)
    }
  })
}

function stop() {
  abort?.abort()
  abort = null
  streaming.value = false
}

function clearChat() {
  if (streaming.value) stop()
  messages.value = []
  error.value = null
}

async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t)
  } catch {
    error.value = '复制失败（权限或环境限制）'
  }
}

async function regenerate() {
  const msgs = messages.value
  if (msgs.length < 2) return
  const last = msgs[msgs.length - 1]
  const prev = msgs[msgs.length - 2]
  if (last.role !== 'assistant' || prev.role !== 'user') return
  if (streaming.value) return
  error.value = null
  messages.value = msgs.slice(0, -1)
  const asstId = pushAssistantPlaceholder()
  scrollToBottomForced()
  streaming.value = true
  abort = new AbortController()
  await streamChat(buildPayload(), {
    model: model.value.trim() || undefined,
    signal: abort.signal,
    onDelta: (s) => patchAssistant(asstId, s),
    onDone: () => {
      streaming.value = false
      abort = null
      scrollToBottomForced()
    },
    onError: (msg) => {
      streaming.value = false
      abort = null
      error.value = msg
      patchAssistant(asstId, `\n\n[错误] ${msg}`)
    }
  })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void send()
  }
}
</script>

<template>
  <div class="shell">
    <header class="top">
      <div class="brand">
        <span class="title">Pretext AI 聊天</span>
        <span class="sub"
          >消息列表虚拟滚动；高度由 <code>prepare</code>+<code>layout</code> 预估，正文用
          <code>layoutWithLines</code> 渲染</span
        >
      </div>
      <div class="actions">
        <button
          type="button"
          class="ghost"
          :aria-expanded="showSettings"
          @click="showSettings = !showSettings"
        >
          设置
        </button>
        <button type="button" class="ghost" @click="clearChat">清空会话</button>
        <button
          type="button"
          class="ghost"
          :disabled="streaming || messages.length < 2"
          @click="regenerate"
        >
          重新生成
        </button>
        <button
          v-if="streaming"
          type="button"
          class="stop"
          @click="stop"
        >
          停止
        </button>
      </div>
    </header>

    <div v-if="showSettings" class="settings panel">
      <label class="field">
        <span>系统提示词</span>
        <textarea v-model="systemPrompt" rows="3" placeholder="可选" />
      </label>
      <label class="field">
        <span>模型 ID（可选，默认服务端 OPENROUTER_MODEL / openai/gpt-4o-mini）</span>
        <input
          v-model="model"
          type="text"
          placeholder="openai/gpt-4o-mini"
          autocomplete="off"
        />
      </label>
      <label class="field inline">
        <span>消息空白处理（Pretext）</span>
        <select v-model="whiteSpace">
          <option value="normal">normal（折叠空白）</option>
          <option value="pre-wrap">pre-wrap（保留空格与换行）</option>
        </select>
      </label>
      <p class="hint">
        在 <code>server/.env</code> 配置 <code>OPENROUTER_API_KEY</code>（或仅用 OpenAI 时配置
        <code>OPENAI_API_KEY</code>）；未配置时使用内置演示流。
      </p>
    </div>

    <div v-if="error" class="banner error" role="alert">
      {{ error }}
    </div>

    <VirtualChatList
      ref="listRef"
      class="list"
      :messages="messages"
      :white-space="whiteSpace"
      :streaming="streaming"
      @copy="copyText"
    />

    <footer class="composer panel">
      <textarea
        v-model="draft"
        class="input"
        rows="3"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        :disabled="streaming"
        @keydown="onKeydown"
      />
      <div class="composer-actions">
        <button type="button" class="primary" :disabled="!canSend" @click="send">
          发送
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  max-width: 880px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.brand .title {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
}

.brand .sub {
  display: block;
  color: var(--muted);
  font-size: 0.85rem;
  margin-top: 4px;
}

.brand code {
  font-size: 0.85em;
  background: var(--surface);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 8px 12px;
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

button.primary {
  border-color: #3d5a8a;
  background: linear-gradient(180deg, #2f4f82, #243a5c);
}

button.stop {
  border-color: #7f1d1d;
  background: #3f2020;
  color: #fecaca;
}

button.ghost {
  background: transparent;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

.settings .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.settings .field.inline {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
}

.settings .field span {
  color: var(--muted);
  font-size: 0.9rem;
}

.settings input,
.settings textarea,
.settings select {
  width: 100%;
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 8px 10px;
}

.settings .hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.settings .hint code {
  font-size: 0.9em;
}

.banner.error {
  background: #2a1515;
  border: 1px solid #5c2a2a;
  color: #fecaca;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.9rem;
}

.list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.composer {
  position: sticky;
  bottom: 0;
  margin-top: auto;
}

.composer .input {
  width: 100%;
  resize: vertical;
  min-height: 72px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  padding: 10px 12px;
}

.composer .input:disabled {
  opacity: 0.65;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
</style>
