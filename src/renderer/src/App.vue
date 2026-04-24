<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <h1 class="title">M3U8 Player</h1>
        <p class="subtitle">基于 WASM 的 HLS 播放器，支持 HEVC (H.265) 软解码</p>
      </div>
    </header>

    <!-- Controls -->
    <section class="controls">
      <div class="url-row">
        <input
          v-model="m3u8Url"
          type="text"
          class="url-input"
          placeholder="输入 m3u8 URL 或本地文件路径，例如：/path/to/stream.m3u8"
          @keydown.enter="play"
        />
        <button class="btn btn-primary" :disabled="!m3u8Url.trim()" @click="play">▶ 播放</button>
        <button class="btn btn-secondary" :disabled="!playerInstance" @click="stop">■ 停止</button>
      </div>

      <div class="options-row">
        <label class="checkbox-label">
          <input v-model="forceSoftware" type="checkbox" @change="onForceSoftwareChange" />
          <span>强制软解</span>
        </label>

        <div class="caps-info">
          <span class="strategy-badge" :class="`strategy-${decodingStrategy}`">
            解码策略: {{ strategyLabel }}
          </span>
          <span class="cap-badge" :class="caps.hasNativeHevc ? 'cap-ok' : 'cap-no'">
            原生 HEVC {{ caps.hasNativeHevc ? '✓' : '✗' }}
          </span>
          <span class="cap-badge" :class="caps.hasWasmSimd ? 'cap-ok' : 'cap-no'">
            WASM SIMD {{ caps.hasWasmSimd ? '✓' : '✗' }}
          </span>
          <span class="cap-badge" :class="caps.hasWasmThreads ? 'cap-ok' : 'cap-no'">
            WASM 线程 {{ caps.hasWasmThreads ? '✓' : '✗' }}
          </span>
        </div>
      </div>
    </section>

    <!-- Player area -->
    <section class="player-section">
      <div ref="playerWrap" class="player-wrap">
        <div v-if="!playing" class="player-placeholder">
          <span class="placeholder-icon">▶</span>
          <p>请输入 m3u8 地址后点击播放</p>
        </div>
        <!-- xgplayer mounts here -->
        <div id="xg-player" ref="playerEl"></div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Player from 'xgplayer'
import HlsPlugin from 'xgplayer-hls'
import {
  detectCapabilities,
  getDecodingStrategy,
  STRATEGY_LABELS,
  type DecoderCapabilities,
  type DecodingStrategy
} from './decoder-init'

// ── State ───────────────────────────────────────────────────────────────────

const m3u8Url = ref('')
const forceSoftware = ref(false)
const playing = ref(false)

const caps = ref<DecoderCapabilities>({
  hasWasm: false,
  hasNativeHevc: false,
  hasWasmSimd: false,
  hasWasmThreads: false
})

const playerEl = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerInstance = ref<any>(null)

// ── Computed ─────────────────────────────────────────────────────────────────

const decodingStrategy = computed<DecodingStrategy>(() =>
  getDecodingStrategy(caps.value, forceSoftware.value)
)

const strategyLabel = computed(() => STRATEGY_LABELS[decodingStrategy.value])

// ── Methods ───────────────────────────────────────────────────────────────────

async function play(): Promise<void> {
  const url = resolveUrl(m3u8Url.value.trim())
  if (!url) return

  stop()
  playing.value = true

  await nextTick()
  if (!playerEl.value) return

  const strategy = decodingStrategy.value
  const useLlVideo = strategy === 'wasm-simd' || strategy === 'wasm'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: Record<string, any> = {
    el: playerEl.value,
    url,
    autoplay: true,
    width: '100%',
    height: '100%',
    lang: 'zh',
    plugins: [HlsPlugin],
    hls: {
      // Pass COOP/COEP headers for WASM threads
      fetchOptions: {
        credentials: 'same-origin'
      }
    }
  }

  if (useLlVideo) {
    // ll-video custom element is registered by ll-video.js loaded in index.html
    config.mediaType = 'll-video'
  }

  playerInstance.value = new Player(config)
}

function stop(): void {
  if (playerInstance.value) {
    playerInstance.value.destroy()
    playerInstance.value = null
  }
  playing.value = false
}

function onForceSoftwareChange(): void {
  // If already playing, restart to apply new decode strategy
  if (playing.value) {
    play()
  }
}

/**
 * If the user enters a bare local file path, convert it to a local-resource:// URL
 * via the Electron preload API so it can be fetched without CORS issues.
 */
function resolveUrl(rawUrl: string): string {
  if (!rawUrl) return ''

  // Already an http/https/local-resource URL – use as-is
  if (/^(https?:|local-resource:)/.test(rawUrl)) {
    return rawUrl
  }

  // Looks like a local path – convert via Electron API when available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  if (win.api?.toLocalResourceUrl) {
    return win.api.toLocalResourceUrl(rawUrl)
  }

  return rawUrl
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  caps.value = await detectCapabilities()
})

onUnmounted(() => {
  stop()
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0d0d0d;
  color: #e8e8e8;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.app-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid #2a2a4a;
  padding: 16px 24px;
}
.header-content {
  max-width: 1200px;
  margin: 0 auto;
}
.title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #7eb8f7;
  margin: 0 0 4px;
}
.subtitle {
  font-size: 0.85rem;
  color: #7a7a9a;
  margin: 0;
}

/* ── Controls ───────────────────────────────────────────────────────────── */
.controls {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.url-input {
  flex: 1;
  padding: 9px 14px;
  border-radius: 6px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #e8e8e8;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}
.url-input:focus {
  border-color: #7eb8f7;
}
.url-input::placeholder {
  color: #555;
}

.btn {
  padding: 9px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition:
    background 0.2s,
    opacity 0.2s;
  white-space: nowrap;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-primary {
  background: #3d7abf;
  color: #fff;
}
.btn-primary:not(:disabled):hover {
  background: #4d8ace;
}
.btn-secondary {
  background: #333;
  color: #ccc;
}
.btn-secondary:not(:disabled):hover {
  background: #444;
}

.options-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.88rem;
  user-select: none;
}
.checkbox-label input[type='checkbox'] {
  accent-color: #7eb8f7;
  width: 15px;
  height: 15px;
}

.caps-info {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.strategy-badge,
.cap-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
}

.strategy-native {
  background: #1e4a2a;
  color: #5de89f;
}
.strategy-wasm-simd {
  background: #1e3a4a;
  color: #5dc8e8;
}
.strategy-wasm {
  background: #2a2a1e;
  color: #e8d85d;
}
.strategy-h264-only {
  background: #3a1e1e;
  color: #e87d5d;
}

.cap-ok {
  background: #1e3a1e;
  color: #6dbe6d;
}
.cap-no {
  background: #2a1e1e;
  color: #6b4040;
}

/* ── Player ─────────────────────────────────────────────────────────────── */
.player-section {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 24px 24px;
  flex: 1;
}

.player-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #2a2a2a;
}

.player-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #444;
  gap: 12px;
  pointer-events: none;
}
.placeholder-icon {
  font-size: 3rem;
  opacity: 0.3;
}
.player-placeholder p {
  font-size: 0.9rem;
  margin: 0;
}

#xg-player {
  width: 100%;
  height: 100%;
}
</style>
