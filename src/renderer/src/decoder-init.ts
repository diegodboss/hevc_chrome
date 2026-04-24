/**
 * decoder-init.ts
 * Decoder initialization and browser capability detection for HEVC WASM playback.
 */

export interface DecoderCapabilities {
  /** WebAssembly is available */
  hasWasm: boolean
  /** Native HEVC hardware decode via MediaSource (Chrome 107+) */
  hasNativeHevc: boolean
  /** WebAssembly SIMD instructions are available (Chrome 91+) */
  hasWasmSimd: boolean
  /** SharedArrayBuffer is available, required for WASM threads (Chrome 74+) */
  hasWasmThreads: boolean
}

/**
 * Minimum WASM binary that uses a SIMD instruction (v128.load).
 * If instantiation succeeds, the runtime supports WASM SIMD.
 */
const SIMD_PROBE = new Uint8Array([
  0x00,
  0x61,
  0x73,
  0x6d, // magic
  0x01,
  0x00,
  0x00,
  0x00, // version
  0x01,
  0x05,
  0x01,
  0x60,
  0x00,
  0x01,
  0x7b, // type section: () -> v128
  0x03,
  0x02,
  0x01,
  0x00, // function section
  0x05,
  0x03,
  0x01,
  0x00,
  0x01, // memory section: 1 page
  0x0a,
  0x0a,
  0x01,
  0x08,
  0x00, // code section
  0x41,
  0x00, //   i32.const 0
  0xfd,
  0x00,
  0x02,
  0x00, //   v128.load  align=2 offset=0
  0x0b //   end
])

/**
 * Detect all decoding capabilities available in the current browser / runtime.
 */
export async function detectCapabilities(): Promise<DecoderCapabilities> {
  const hasWasm = typeof WebAssembly !== 'undefined'

  // Native HEVC via MediaSource Extensions (Chrome 107+ on supported platforms)
  let hasNativeHevc = false
  try {
    if (typeof MediaSource !== 'undefined' && typeof MediaSource.isTypeSupported === 'function') {
      hasNativeHevc = MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0"')
    }
  } catch {
    hasNativeHevc = false
  }

  // WASM SIMD: probe by instantiating a tiny SIMD module
  let hasWasmSimd = false
  if (hasWasm) {
    try {
      await WebAssembly.instantiate(SIMD_PROBE)
      hasWasmSimd = true
    } catch {
      hasWasmSimd = false
    }
  }

  // WASM Threads require SharedArrayBuffer (needs COOP/COEP headers)
  const hasWasmThreads = typeof SharedArrayBuffer !== 'undefined'

  return { hasWasm, hasNativeHevc, hasWasmSimd, hasWasmThreads }
}

export type DecodingStrategy = 'native' | 'wasm-simd' | 'wasm' | 'h264-only'

/**
 * Choose the best decoding strategy given detected capabilities.
 *
 * Priority:
 *  1. Native hardware HEVC (unless forceSoftware is set)
 *  2. WASM SIMD software decode
 *  3. WASM software decode (no SIMD)
 *  4. H.264 only fallback
 */
export function getDecodingStrategy(
  caps: DecoderCapabilities,
  forceSoftware: boolean
): DecodingStrategy {
  if (!forceSoftware && caps.hasNativeHevc) {
    return 'native'
  }
  if (caps.hasWasm && caps.hasWasmSimd) {
    return 'wasm-simd'
  }
  if (caps.hasWasm) {
    return 'wasm'
  }
  return 'h264-only'
}

/**
 * Human-readable label for a decoding strategy.
 */
export const STRATEGY_LABELS: Record<DecodingStrategy, string> = {
  native: '原生硬解码',
  'wasm-simd': 'WASM SIMD 软解码',
  wasm: 'WASM 软解码',
  'h264-only': '仅支持 H.264'
}
