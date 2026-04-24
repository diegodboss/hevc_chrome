#!/usr/bin/env node
/**
 * download-decoders.mjs
 *
 * Downloads WASM decoder files and the ll-video custom element script
 * from the CDN into src/renderer/public/.
 *
 * Run once before first use:
 *   node scripts/download-decoders.mjs
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'src', 'renderer', 'public')

// ---------------------------------------------------------------------------
// CDN base – change this if you host the files yourself
// ---------------------------------------------------------------------------
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/ll-video@latest/dist'

/**
 * Files to download.
 * Each entry: { url, dest } where dest is relative to PUBLIC.
 */
const FILES = [
  // ll-video custom element (main entry)
  { url: `${CDN_BASE}/ll-video.js`, dest: 'll-video.js' },

  // H.264 WASM decoder
  { url: `${CDN_BASE}/decoder/h264/decoder.js`, dest: 'decoder/h264/decoder.js' },
  { url: `${CDN_BASE}/decoder/h264/decoder.wasm`, dest: 'decoder/h264/decoder.wasm' },

  // H.265 base decoder
  { url: `${CDN_BASE}/decoder/h265/decoder.js`, dest: 'decoder/h265/decoder.js' },
  { url: `${CDN_BASE}/decoder/h265/decoder.wasm`, dest: 'decoder/h265/decoder.wasm' },

  // H.265 SIMD-accelerated decoder
  { url: `${CDN_BASE}/decoder/h265/decoder-simd.js`, dest: 'decoder/h265/decoder-simd.js' },
  { url: `${CDN_BASE}/decoder/h265/decoder-simd.wasm`, dest: 'decoder/h265/decoder-simd.wasm' },

  // H.265 threaded decoder
  { url: `${CDN_BASE}/decoder/h265/decoder-thread.js`, dest: 'decoder/h265/decoder-thread.js' },
  {
    url: `${CDN_BASE}/decoder/h265/decoder-thread.wasm`,
    dest: 'decoder/h265/decoder-thread.wasm'
  },
  {
    url: `${CDN_BASE}/decoder/h265/decoder-thread.worker.js`,
    dest: 'decoder/h265/decoder-thread.worker.js'
  },

  // H.265 ASM.js fallback decoder
  { url: `${CDN_BASE}/decoder/h265/decoder-asm.js`, dest: 'decoder/h265/decoder-asm.js' }
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function download(url, destPath) {
  // Ensure parent directory exists
  const dir = dirname(destPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
  }

  await pipeline(res.body, createWriteStream(destPath))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('Downloading WASM decoders and ll-video custom element...\n')

let success = 0
let failed = 0

for (const { url, dest } of FILES) {
  const destPath = join(PUBLIC, dest)
  process.stdout.write(`  ${dest.padEnd(50)}`)
  try {
    await download(url, destPath)
    console.log('✓')
    success++
  } catch (err) {
    console.log(`✗  (${err.message})`)
    failed++
  }
}

console.log(`\nDone. ${success} downloaded, ${failed} failed.`)
if (failed > 0) {
  console.warn(
    '\nSome files could not be downloaded. ' +
      'Check your internet connection or update CDN_BASE in this script.'
  )
  process.exit(1)
}
