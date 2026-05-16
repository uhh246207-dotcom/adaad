// psdGenerator.js — build a parser-compatible template entirely
// from an in-app builder, with no .psd file involved.
//
// The output of `generateTemplateFromSpec(spec)` matches what
// `parsePsdBuffer(buffer)` returns:
//
//   { width, height, layers: ParsedLayer[], thumbnailDataUrl }
//
// so the rest of the pipeline (admin preview, locks, publish to
// shop, customer in-browser editor, watermark, export) keeps
// working without modification. The builder just feeds a different
// source of truth into the same downstream code.
//
// The spec shape:
//
//   {
//     width, height,
//     background:
//       { kind: 'color',    color }
//     | { kind: 'gradient', from, to, angle }
//     | { kind: 'image',    dataUrl }
//     | { kind: 'none' }
//     | null,
//     layers: [
//       // text slot
//       { kind: 'text', name, text, x, y, w, h,
//         color, fontSize, fontFamily, align, opacity },
//       // image slot (placeholder; customer replaces later)
//       { kind: 'image', name, x, y, w, h,
//         dataUrl?, label?, shape?, opacity },
//     ],
//   }
//
// Layer order in spec.layers is BOTTOM-UP (first = closest to the
// background). The output `layers` is TOP-DOWN to mirror the
// parser, since the renderer reverses internally.

import { isLockLayerName } from './layerNaming'

// ── Public API ─────────────────────────────────────────────────────

// Render the spec straight to a target canvas. Used by the live
// preview in the builder UI — far cheaper than producing per-layer
// data URLs on every keystroke.
export async function renderSpecToCanvas(spec, canvas) {
  const w = Math.max(1, spec.width | 0)
  const h = Math.max(1, spec.height | 0)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)

  if (spec.background && spec.background.kind && spec.background.kind !== 'none') {
    await drawBackgroundOnCtx(ctx, spec.background, w, h)
  }

  for (const L of spec.layers || []) {
    if (L.hidden) continue
    ctx.globalAlpha = clamp(L.opacity ?? 1, 0, 1)
    if (L.kind === 'text') {
      drawTextLayerOnCtx(ctx, L)
    } else {
      await drawImageLayerOnCtx(ctx, L)
    }
  }
  ctx.globalAlpha = 1
  return canvas
}

// Build a parser-compatible template object from the spec. Every
// layer becomes a parsed entry with its own baked PNG bitmap so
// the customer-side renderer can blit it pixel-perfect when no
// override is present. Text layers also keep textColor/textFontSize
// /textAlign so the renderer can re-typeset on customer edit.
export async function generateTemplateFromSpec(spec) {
  const w = Math.max(1, spec.width | 0)
  const h = Math.max(1, spec.height | 0)
  const layers = []
  let id = 0

  // Background → a locked, full-bleed image layer named
  // `lock_background` so it's auto-protected from customer edits.
  if (spec.background && spec.background.kind && spec.background.kind !== 'none') {
    const bgUrl = await rasterizeBackgroundLayer(spec.background, w, h)
    layers.push({
      id: `G${id++}-lock_background`,
      name: 'lock_background',
      kind: 'image',
      left: 0, top: 0, width: w, height: h,
      opacity: 1,
      hidden: false,
      isHiddenInPsd: false,
      bitmapDataUrl: bgUrl,
    })
  }

  // User layers, in spec (bottom-up) order.
  for (const L of spec.layers || []) {
    const lw = Math.max(1, L.w | 0)
    const lh = Math.max(1, L.h | 0)
    const layer = {
      id: `G${id++}-${(L.name || 'layer').replace(/\s+/g, '_')}`,
      name: L.name || `layer_${id}`,
      kind: L.kind,
      left: L.x | 0,
      top: L.y | 0,
      width: lw,
      height: lh,
      opacity: typeof L.opacity === 'number' ? L.opacity : 1,
      hidden: false,
      isHiddenInPsd: false,
    }

    if (L.kind === 'text') {
      const text = L.text || ''
      const color = L.color || '#ffffff'
      const fontSize = Math.max(8, L.fontSize || estimateTextSize(lh))
      const align = L.align || 'left'
      layer.text = text
      layer.textColor = color
      layer.textFontSize = fontSize
      layer.textAlign = align
      layer.fontFamily = L.fontFamily || 'Inter, Arial, sans-serif'
      layer.bitmapDataUrl = rasterizeTextLayer({
        ...L, w: lw, h: lh, fontSize, color, align,
      })
    } else {
      // Image slot. Stash the shape so the renderer can apply a
      // circular clip when the customer swaps in a new picture.
      if (L.shape) layer.shape = L.shape
      layer.bitmapDataUrl = await rasterizeImageLayer({
        ...L, w: lw, h: lh,
      })
    }

    layers.push(layer)
  }

  // Compose a thumbnail by stacking the just-baked bitmaps.
  const thumb = document.createElement('canvas')
  thumb.width = w
  thumb.height = h
  const tctx = thumb.getContext('2d')
  for (const L of layers) {
    if (L.hidden) continue
    try {
      const img = await loadImage(L.bitmapDataUrl)
      tctx.globalAlpha = L.opacity ?? 1
      if (L.shape === 'circle') {
        tctx.save()
        const r = Math.min(L.width, L.height) / 2
        tctx.beginPath()
        tctx.arc(L.left + L.width / 2, L.top + L.height / 2, r, 0, Math.PI * 2)
        tctx.clip()
        tctx.drawImage(img, L.left, L.top, L.width, L.height)
        tctx.restore()
      } else {
        tctx.drawImage(img, L.left, L.top, L.width, L.height)
      }
    } catch { /* skip broken layer */ }
  }
  tctx.globalAlpha = 1

  // Reverse to top-down (index 0 = top-most), matching parser.
  return {
    width: w,
    height: h,
    layers: layers.reverse(),
    thumbnailDataUrl: thumb.toDataURL('image/png'),
  }
}

// ── Sensible defaults for the builder UI ──────────────────────────
// Each slot is normalised to a 1280×720 reference doc; the builder
// scales x/y/w/h/fontSize when the actual doc size differs.

const REF_W = 1280
const REF_H = 720

// Slot id matches the role id in layerNaming.js exactly so the
// generated layer is editable on the customer page.
export const SLOT_PRESETS = [
  // Text slots
  { id: 'text_title', kind: 'text', label: 'Tiêu đề chính', text: 'TIÊU ĐỀ',  enabled: true,
    x: 60,  y: 60,  w: 720, h: 130, fontSize: 90, color: '#ffffff', align: 'left' },
  { id: 'text_name',  kind: 'text', label: 'Tên',           text: 'Tên kênh', enabled: false,
    x: 60,  y: 200, w: 720, h: 80,  fontSize: 44, color: '#4dd0ff', align: 'left' },
  { id: 'text_1',     kind: 'text', label: 'Nội dung 1',    text: 'Dòng 1',   enabled: false,
    x: 60,  y: 300, w: 720, h: 60,  fontSize: 32, color: '#ffffff', align: 'left' },
  { id: 'text_2',     kind: 'text', label: 'Nội dung 2',    text: 'Dòng 2',   enabled: false,
    x: 60,  y: 370, w: 720, h: 60,  fontSize: 28, color: '#ffffff', align: 'left' },
  { id: 'text_3',     kind: 'text', label: 'Nội dung 3',    text: 'Dòng 3',   enabled: false,
    x: 60,  y: 440, w: 720, h: 60,  fontSize: 24, color: '#ffffff', align: 'left' },
  { id: 'text_price', kind: 'text', label: 'Giá',           text: '99K',      enabled: false,
    x: 60,  y: 560, w: 320, h: 110, fontSize: 72, color: '#facc15', align: 'left' },
  { id: 'title_logo', kind: 'text', label: 'Tiêu đề logo',  text: 'LOGO',     enabled: false,
    x: 940, y: 600, w: 300, h: 60,  fontSize: 32, color: '#ffffff', align: 'right' },
  { id: 'text_logo',  kind: 'text', label: 'Text logo phụ', text: 'tagline',  enabled: false,
    x: 940, y: 660, w: 300, h: 40,  fontSize: 20, color: '#ffffffb3', align: 'right' },

  // Image slots
  { id: 'character_png', kind: 'image', label: 'Nhân vật PNG', enabled: false,
    x: 720, y: 0,   w: 560, h: 720, shape: 'rect' },
  { id: 'img_png',       kind: 'image', label: 'Ảnh chính',    enabled: false,
    x: 380, y: 180, w: 420, h: 360, shape: 'rect' },
  { id: 'avt_png',       kind: 'image', label: 'Avatar tròn',  enabled: false,
    x: 540, y: 480, w: 200, h: 200, shape: 'circle' },
  { id: 'logo',          kind: 'image', label: 'Logo',         enabled: false,
    x: 1080, y: 560, w: 160, h: 120, shape: 'rect' },
]

// Scale a slot's coordinates from the 1280×720 reference space to
// the actual doc size. Used when the admin picks a different preset.
export function scaleSlotsToDoc(slots, w, h) {
  const sx = w / REF_W
  const sy = h / REF_H
  return slots.map((s) => ({
    ...s,
    x: Math.round(s.x * sx),
    y: Math.round(s.y * sy),
    w: Math.round(s.w * sx),
    h: Math.round(s.h * sy),
    fontSize: s.fontSize ? Math.max(8, Math.round(s.fontSize * sy)) : s.fontSize,
  }))
}

// Re-scale already-tweaked slots when the admin changes doc size
// in mid-builder. Accepts the *previous* doc dims so we don't
// accumulate rounding drift.
export function rescaleSlots(slots, prevW, prevH, nextW, nextH) {
  if (!prevW || !prevH) return slots
  const sx = nextW / prevW
  const sy = nextH / prevH
  return slots.map((s) => ({
    ...s,
    x: Math.round(s.x * sx),
    y: Math.round(s.y * sy),
    w: Math.round(s.w * sx),
    h: Math.round(s.h * sy),
    fontSize: s.fontSize ? Math.max(8, Math.round(s.fontSize * sy)) : s.fontSize,
  }))
}

// Convert builder slot config → spec.layer entry the generator
// understands. Drops the UI-only fields (label, enabled).
export function slotToLayerSpec(slot) {
  if (slot.kind === 'text') {
    return {
      kind: 'text',
      name: slot.id,
      text: slot.text || '',
      x: slot.x, y: slot.y, w: slot.w, h: slot.h,
      color: slot.color || '#ffffff',
      fontSize: slot.fontSize || 32,
      fontFamily: slot.fontFamily || 'Inter, Arial, sans-serif',
      align: slot.align || 'left',
      opacity: slot.opacity ?? 1,
    }
  }
  return {
    kind: 'image',
    name: slot.id,
    label: slot.label,
    x: slot.x, y: slot.y, w: slot.w, h: slot.h,
    dataUrl: slot.dataUrl,
    shape: slot.shape || 'rect',
    fill: slot.fill,
    opacity: slot.opacity ?? 1,
  }
}

// ── Internals ─────────────────────────────────────────────────────

function clamp(v, a, b) { return v < a ? a : v > b ? b : v }

function estimateTextSize(layerHeight) {
  return Math.max(12, Math.min(Math.round(layerHeight * 0.7), 200))
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// Background painted directly onto a target ctx (used for live
// preview) — no intermediate canvas needed.
async function drawBackgroundOnCtx(ctx, bg, w, h) {
  if (bg.kind === 'color') {
    ctx.fillStyle = bg.color || '#0e1120'
    ctx.fillRect(0, 0, w, h)
    return
  }
  if (bg.kind === 'gradient') {
    const angle = ((bg.angle ?? 135) * Math.PI) / 180
    const cx = w / 2, cy = h / 2
    const len = Math.max(w, h) / 2
    const dx = Math.cos(angle) * len
    const dy = Math.sin(angle) * len
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy)
    grad.addColorStop(0, bg.from || '#6e4bff')
    grad.addColorStop(1, bg.to || '#4dd0ff')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    return
  }
  if (bg.kind === 'image' && bg.dataUrl) {
    try {
      const img = await loadImage(bg.dataUrl)
      // cover-fit
      const sa = img.naturalWidth / img.naturalHeight
      const ta = w / h
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
      if (sa > ta) { sw = img.naturalHeight * ta; sx = (img.naturalWidth - sw) / 2 }
      else        { sh = img.naturalWidth / ta; sy = (img.naturalHeight - sh) / 2 }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
    } catch { /* ignore */ }
  }
}

// Bake a fresh 2D canvas at doc resolution and toDataURL — used by
// generateTemplateFromSpec when producing the final layer bitmaps.
async function rasterizeBackgroundLayer(bg, w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  await drawBackgroundOnCtx(c.getContext('2d'), bg, w, h)
  return c.toDataURL('image/png')
}

// Draw a text layer onto a target ctx at its absolute position.
// Mirrors psdRenderer.drawTextLayer's "redraw from override" path
// so the live preview matches the eventual baked bitmap.
function drawTextLayerOnCtx(ctx, L) {
  const text = L.text ?? ''
  if (!text) return
  const fontSize = L.fontSize || estimateTextSize(L.h || L.height)
  const family = L.fontFamily || 'Inter, Arial, sans-serif'
  const color = L.color || '#ffffff'
  const align = L.align || 'left'
  const lw = L.w ?? L.width
  const lh = L.h ?? L.height
  const lx = L.x ?? L.left
  const ly = L.y ?? L.top

  ctx.save()
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.font = `${fontSize}px ${family}`
  ctx.textAlign = align
  const cx = align === 'left'
    ? lx
    : align === 'right'
    ? lx + lw
    : lx + lw / 2
  const cy = ly + lh / 2
  const lines = wrapLines(ctx, text, lw)
  const lineHeight = fontSize * 1.2
  let y = cy - (lineHeight * lines.length) / 2 + lineHeight / 2
  for (const line of lines) {
    ctx.fillText(line, cx, y)
    y += lineHeight
  }
  ctx.restore()
}

// Bake a single text layer to its own w×h canvas, returning a
// PNG data URL. This is what gets stored on the parsed layer's
// `bitmapDataUrl` so unedited preview looks pixel-identical to
// what the live builder showed.
function rasterizeTextLayer(L) {
  const w = Math.max(1, L.w | 0)
  const h = Math.max(1, L.h | 0)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  // Draw at local origin (0,0,w,h) — when composed into the doc,
  // the outer renderer offsets by (left, top).
  drawTextLayerOnCtx(ctx, { ...L, x: 0, y: 0, left: 0, top: 0, w, h, width: w, height: h })
  return c.toDataURL('image/png')
}

async function drawImageLayerOnCtx(ctx, L) {
  const lx = L.x ?? L.left
  const ly = L.y ?? L.top
  const lw = L.w ?? L.width
  const lh = L.h ?? L.height
  const shape = L.shape || 'rect'
  const cx = lx + lw / 2
  const cy = ly + lh / 2
  const r = Math.min(lw, lh) / 2

  if (L.dataUrl) {
    try {
      const img = await loadImage(L.dataUrl)
      const sa = img.naturalWidth / img.naturalHeight
      const ta = lw / lh
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
      if (sa > ta) { sw = img.naturalHeight * ta; sx = (img.naturalWidth - sw) / 2 }
      else        { sh = img.naturalWidth / ta; sy = (img.naturalHeight - sh) / 2 }
      ctx.save()
      if (shape === 'circle') {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
      }
      ctx.drawImage(img, sx, sy, sw, sh, lx, ly, lw, lh)
      ctx.restore()
      return
    } catch { /* fallthrough to placeholder */ }
  }

  // Placeholder: tinted box / circle with dashed outline + label.
  ctx.save()
  if (shape === 'circle') {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
  }
  ctx.fillStyle = L.fill || 'rgba(110,75,255,0.18)'
  ctx.fillRect(lx, ly, lw, lh)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.setLineDash([10, 6])
  ctx.lineWidth = 2
  if (shape === 'circle') {
    ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.stroke()
  } else {
    ctx.strokeRect(lx + 1, ly + 1, lw - 2, lh - 2)
  }
  ctx.restore()

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  const labelSize = Math.max(14, Math.min(lw, lh) / 8)
  ctx.font = `bold ${labelSize}px Inter, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(L.label || L.name || 'Ảnh', cx, cy)
  ctx.restore()
}

async function rasterizeImageLayer(L) {
  const w = Math.max(1, L.w | 0)
  const h = Math.max(1, L.h | 0)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  await drawImageLayerOnCtx(ctx, {
    ...L, x: 0, y: 0, left: 0, top: 0, w, h, width: w, height: h,
  })
  return c.toDataURL('image/png')
}

function wrapLines(ctx, text, maxWidth) {
  const hard = String(text || '').split(/\r?\n/)
  const out = []
  for (const h of hard) {
    if (!h) { out.push(''); continue }
    const words = h.split(/\s+/)
    let line = ''
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w
      if (ctx.measureText(probe).width > maxWidth && line) { out.push(line); line = w }
      else line = probe
    }
    if (line) out.push(line)
  }
  return out.length ? out : ['']
}

// Re-exported here so callers don't need to also import
// layerNaming when they only deal with generated templates.
export { isLockLayerName }
