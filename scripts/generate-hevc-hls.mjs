#!/usr/bin/env node
/**
 * generate-hevc-hls.mjs
 *
 * Generates a local HEVC (H.265) HLS test stream using FFmpeg.
 *
 * Prerequisites:
 *   - FFmpeg must be installed and available on PATH (https://ffmpeg.org/download.html)
 *
 * Usage:
 *   node scripts/generate-hevc-hls.mjs [output-dir] [duration-seconds]
 *
 * Defaults:
 *   output-dir : test-streams/hevc-hls
 *   duration   : 30  (seconds)
 *
 * The script generates a synthetic colour-bar test video encoded with HEVC,
 * packaged as an HLS stream (.m3u8 + .ts segments).
 */

import { execFileSync } from 'child_process'
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------
const outputDir = resolve(process.argv[2] ?? join(ROOT, 'test-streams', 'hevc-hls'))
const duration = Number(process.argv[3] ?? 30)

if (isNaN(duration) || duration <= 0) {
  console.error('Error: duration must be a positive number.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Check FFmpeg
// ---------------------------------------------------------------------------
function checkFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

if (!checkFfmpeg()) {
  console.error(
    'Error: ffmpeg not found on PATH.\n' +
      'Install FFmpeg from https://ffmpeg.org/download.html and make sure it is in your PATH.'
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Generate stream
// ---------------------------------------------------------------------------
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

const m3u8Path = join(outputDir, 'index.m3u8')
const segmentPattern = join(outputDir, 'segment%03d.ts')

console.log(`Generating HEVC HLS test stream…`)
console.log(`  Output : ${outputDir}`)
console.log(`  Duration: ${duration}s`)

/**
 * FFmpeg arguments:
 *  - lavfi testsrc2: synthetic colour-bar test source
 *  - libx265: HEVC encoder
 *  - hls muxer: produces .m3u8 + .ts segments
 */
const ffmpegArgs = [
  '-y', // overwrite without prompt
  // Input: synthetic test source
  '-f',
  'lavfi',
  '-i',
  `testsrc2=size=1280x720:rate=30:duration=${duration}`,
  '-f',
  'lavfi',
  '-i',
  `sine=frequency=1000:duration=${duration}`,
  // Video codec: HEVC (H.265)
  '-c:v',
  'libx265',
  '-preset',
  'ultrafast',
  '-crf',
  '28',
  '-profile:v',
  'main',
  '-tag:v',
  'hvc1',
  // Audio codec
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  // HLS muxer options
  '-f',
  'hls',
  '-hls_time',
  '4', // segment duration (seconds)
  '-hls_list_size',
  '0', // keep all segments in playlist
  '-hls_segment_type',
  'mpegts',
  '-hls_segment_filename',
  segmentPattern,
  m3u8Path
]

try {
  execFileSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' })
} catch (err) {
  console.error('\nFFmpeg failed:', err.message)
  process.exit(1)
}

// Write a simple README next to the generated stream
writeFileSync(
  join(outputDir, 'README.md'),
  `# HEVC HLS Test Stream\n\nGenerated with \`generate-hevc-hls.mjs\`.\n\n` +
    `Open \`index.m3u8\` in the M3U8 Player to verify HEVC playback.\n`
)

console.log(`\nDone! Play the stream with:\n  ${m3u8Path}`)
