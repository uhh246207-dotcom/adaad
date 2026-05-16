// Lightweight font registry backed by the browser FontFace API.
// Uploaded .ttf / .otf files are decoded and added to document.fonts
// so Konva's text rasteriser picks them up immediately.

import { create } from 'zustand'

const SYSTEM_FONTS = [
  'Inter', 'Arial', 'Georgia', 'Times New Roman',
  'Courier', 'Verdana', 'Impact', 'Tahoma', 'Helvetica',
]

export const useFontStore = create((set, get) => ({
  custom: [],            // [{ family, url }]
  status: 'idle',        // 'idle' | 'loading' | 'error'
  error: null,

  list: () => {
    const c = get().custom.map(f => f.family)
    // de-dupe while preserving order
    const seen = new Set()
    return [...SYSTEM_FONTS, ...c].filter(f => {
      const k = f.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k); return true
    })
  },

  uploadFont: async (file) => {
    if (!file) return null
    const ok = /\.(ttf|otf)$/i.test(file.name)
    if (!ok) {
      set({ status: 'error', error: 'Chỉ hỗ trợ .ttf hoặc .otf' })
      return null
    }
    set({ status: 'loading', error: null })
    try {
      const buf = await file.arrayBuffer()
      // strip extension, sanitize family name
      const family = file.name.replace(/\.(ttf|otf)$/i, '').replace(/[^\w\s-]/g, '').trim() || 'CustomFont'
      const face = new FontFace(family, buf)
      await face.load()
      document.fonts.add(face)
      const blob = new Blob([buf], { type: file.name.endsWith('.otf') ? 'font/otf' : 'font/ttf' })
      const url = URL.createObjectURL(blob)
      set(s => ({ custom: [...s.custom, { family, url }], status: 'idle' }))
      return family
    } catch (err) {
      console.error('[fontManager] load failed', err)
      set({ status: 'error', error: 'Không nạp được font. File có thể bị hỏng.' })
      return null
    }
  },
}))
