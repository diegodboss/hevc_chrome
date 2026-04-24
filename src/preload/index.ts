import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs exposed to renderer
const api = {
  /**
   * Convert a local file path to a local-resource:// URL
   * so the renderer can load local m3u8 files and HLS segments.
   */
  toLocalResourceUrl: (filePath: string): string => {
    const normalized = filePath.replace(/\\/g, '/')
    return `local-resource://${encodeURIComponent(normalized)}`
  }
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
// only when context isolation is enabled, otherwise add to the global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in d.ts)
  window.electron = electronAPI
  // @ts-expect-error (define in d.ts)
  window.api = api
}
