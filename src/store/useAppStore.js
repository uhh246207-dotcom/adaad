import { create } from 'zustand'

const OWNED_KEY = 'nova_owned_v1'
const DOWNLOADS_KEY = 'nova_downloads_v1'

function safeParse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

/**
 * downloadAsset — universal helper to trigger a browser download for any
 * URL / dataURL / Blob. Returns a promise that resolves to the suggested
 * filename so the caller can confirm it.
 *
 * Why a single helper:
 *   - Same UX everywhere (Shop, Downloads page, Source page, future pages).
 *   - Falls back gracefully if `fetch` cannot reach the asset (e.g. CORS),
 *     by handing the URL to a vanilla <a download> click.
 */
export async function downloadAsset(input, suggestedName = 'nova-asset') {
  const safeName = suggestedName.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'nova-asset'
  // Direct Blob
  if (input instanceof Blob) {
    const url = URL.createObjectURL(input)
    triggerAnchor(url, safeName)
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return safeName
  }
  // Data URL or http(s)
  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      triggerAnchor(input, safeName)
      return safeName
    }
    // For remote URLs we try to fetch → blob (so the file ends up in
    // Downloads with the right extension). If it fails (CORS), we just
    // navigate the anchor and let the browser handle it.
    try {
      const res = await fetch(input, { mode: 'cors' })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      triggerAnchor(url, safeName)
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      return safeName
    } catch {
      triggerAnchor(input, safeName)
      return safeName
    }
  }
  throw new Error('downloadAsset: unsupported input')
}

function triggerAnchor(href, download) {
  const a = document.createElement('a')
  a.href = href
  a.download = download
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export const useAppStore = create((set, get) => ({
  // owned[] — product IDs the user has acquired (free or paid)
  owned: safeParse(OWNED_KEY, []),
  // downloads — { [productId]: { count, lastAt } }, used for the
  // "Downloads" page and to track "downloaded N times" hints.
  downloads: safeParse(DOWNLOADS_KEY, {}),

  toasts: [],
  sidebarOpen: true,
  mobileSidebarOpen: false,

  addOwned: (productId) => {
    const owned = get().owned.includes(productId)
      ? get().owned
      : [...get().owned, productId]
    localStorage.setItem(OWNED_KEY, JSON.stringify(owned))
    set({ owned })
  },

  isOwned: (productId) => get().owned.includes(productId),

  /**
   * recordDownload — bump the download counter for a product. Pure
   * bookkeeping; the actual file delivery is up to the caller (often via
   * `downloadAsset`). Returns the new count.
   */
  recordDownload: (productId) => {
    const prev = get().downloads[productId] || { count: 0, lastAt: 0 }
    const next = { count: prev.count + 1, lastAt: Date.now() }
    const downloads = { ...get().downloads, [productId]: next }
    try { localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads)) }
    catch (e) { console.warn('downloads: localStorage quota', e) }
    set({ downloads })
    return next.count
  },

  getDownloadCount: (productId) => get().downloads[productId]?.count || 0,

  /**
   * downloadProduct — high-level helper used by Shop, Downloads page,
   * etc. It picks the best asset for the product (preview image →
   * source bundle URL → first slideshow image), kicks off the browser
   * download and bookkeeps the counter.
   */
  downloadProduct: async (product) => {
    if (!product) return
    const ext = product.fileExt
      || (product.fileType === 'zip' ? 'zip'
      : product.format ? product.format.toLowerCase()
      : 'png')
    const baseName = (product.title || 'nova')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
    const suggested = `${baseName}-${product.id || 'asset'}.${ext}`
    const src = product.fileUrl
      || product.previewDataUrl
      || (Array.isArray(product.images) && product.images[0])
      || product.preview
    try {
      if (src) {
        await downloadAsset(src, suggested)
      } else {
        // Fallback: a tiny text receipt so the user sees something.
        const blob = new Blob(
          [`NOVA AI Studio\nProduct: ${product.title}\nID: ${product.id}\n`],
          { type: 'text/plain' },
        )
        await downloadAsset(blob, `${baseName}-receipt.txt`)
      }
      const count = get().recordDownload(product.id)
      get().toast(
        `Đã tải "${product.title}" (lần ${count})`,
        'success',
        '⬇ Tải xuống',
      )
      return true
    } catch (err) {
      console.error(err)
      get().toast('Không thể tải file', 'error', 'Lỗi')
      return false
    }
  },

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

  toast: (message, type = 'info', title = '') => {
    const id = Date.now() + Math.random()
    set(s => ({ toasts: [...s.toasts, { id, message, type, title }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3200)
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
