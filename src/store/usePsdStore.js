// usePsdStore — admin-authored PSD templates, parsed in-browser.
//
// A "template" here is the parsed form of a .psd uploaded by the
// admin: document size, an array of layers (each with a baked PNG
// data URL), plus a per-template policy (locks, custom labels,
// fonts, watermark, export fee).
//
// Persistence model:
//   - The template *metadata* is JSON-serialisable and goes into
//     localStorage so the customer page survives a reload.
//   - Per-layer bitmap data URLs are part of the template object,
//     which means the whole thing can grow large fast (a 1080p PSD
//     with a dozen layers can hit several megabytes).
//
//   We mitigate quota issues two ways:
//   1) When `psdBuffer` is provided to createTemplate(), we keep
//      the raw bytes in a MEMORY-ONLY map keyed by template id.
//      Re-parsing isn't needed for normal customer flows because
//      the layer bitmaps are already inlined; the buffer is mostly
//      a diagnostic aid for the admin during the same session.
//   2) If the persisted blob would exceed PERSIST_BYTES_LIMIT we
//      drop layer.bitmapDataUrl from the persisted copy. The
//      template still lives in the in-memory `templates` array
//      with all bitmaps intact for the current session, but a
//      reload will see an empty preview. The customer-side editor
//      surfaces a clear "template not available" guard for that.
//
// We deliberately don't gzip or base64-shave because the data URLs
// are already PNGs (compressed) and the overhead of decoding +
// re-encoding on every read isn't worth ~10% savings.

import { create } from 'zustand'

const TEMPLATES_KEY = 'nova_psd_templates_v1'
const PERSIST_BYTES_LIMIT = 4.5 * 1024 * 1024 // soft cap before we strip bitmaps

// In-memory cache for the original PSD bytes. Cleared on reload.
export const psdBufferCache = new Map() // id -> ArrayBuffer

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || [] }
  catch { return [] }
}

function persist(list) {
  // Serialise once, then check size. If under the soft cap we keep
  // bitmaps; otherwise we re-serialise a "lean" copy without them.
  try {
    const blob = JSON.stringify(list)
    if (blob.length < PERSIST_BYTES_LIMIT) {
      localStorage.setItem(TEMPLATES_KEY, blob)
      return
    }
    const lean = list.map(stripHeavyBitmaps)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(lean))
    console.warn('[psdStore] persisted lean copy (bitmaps dropped) — too large for localStorage')
  } catch (err) {
    console.warn('[psdStore] localStorage write failed', err)
  }
}

function stripHeavyBitmaps(t) {
  return {
    ...t,
    layers: (t.layers || []).map((L) => ({ ...L, bitmapDataUrl: null })),
    thumbnailDataUrl: t.thumbnailDataUrl, // keep the small composite preview
  }
}

export const usePsdStore = create((set, get) => ({
  templates: loadTemplates(),

  /**
   * createTemplate — register a new admin template.
   *
   * @param {object} t
   * @param {string} t.name
   * @param {number} t.width
   * @param {number} t.height
   * @param {Array}  t.layers     // ParsedLayer[] from psdParser
   * @param {string} t.thumbnailDataUrl
   * @param {object} t.locks      // { [layerName]: true }
   * @param {object} t.customLabels // { [roleId]: string }
   * @param {Array}  t.fonts      // [{ family, dataUrl }]
   * @param {number} t.exportFee  // coins; 0 = free
   * @param {string} t.watermarkText
   * @param {boolean} t.allowFreePreview
   * @param {ArrayBuffer} [t.psdBuffer] // optional raw bytes for the session cache
   *
   * @returns the persisted record (with id).
   */
  createTemplate: (t) => {
    const id = Math.random().toString(36).slice(2, 10)
    const record = {
      id,
      name: t.name || 'Untitled template',
      width: t.width,
      height: t.height,
      layers: t.layers || [],
      thumbnailDataUrl: t.thumbnailDataUrl || null,
      locks: t.locks || {},
      customLabels: t.customLabels || {},
      fonts: t.fonts || [],
      exportFee: typeof t.exportFee === 'number' ? t.exportFee : 30,
      watermarkText: (t.watermarkText ?? 'NOVA · PREVIEW').toString(),
      allowFreePreview: t.allowFreePreview !== false,
      createdAt: new Date().toISOString(),
    }
    if (t.psdBuffer) psdBufferCache.set(id, t.psdBuffer)
    const next = [...get().templates, record]
    persist(next)
    set({ templates: next })
    return record
  },

  updateTemplate: (id, changes) => {
    const next = get().templates.map((x) => x.id === id ? { ...x, ...changes } : x)
    persist(next)
    set({ templates: next })
  },

  deleteTemplate: (id) => {
    psdBufferCache.delete(id)
    const next = get().templates.filter((x) => x.id !== id)
    persist(next)
    set({ templates: next })
  },

  getTemplate: (id) => get().templates.find((x) => x.id === id) || null,
  getTemplateBuffer: (id) => psdBufferCache.get(id) || null,
}))
