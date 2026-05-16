// watermark.js — apply a tiled diagonal watermark to a PNG/JPG ArrayBuffer.
// Used by the customer Photopea editor for free "preview" exports.
// Returns a Promise<Blob> (image/png by default).
//
// We deliberately re-encode through <canvas> so the watermark becomes part
// of the pixels — copying the file out of the browser preserves it.

export async function watermarkImageBuffer(buffer, mime = 'image/png', opts = {}) {
  const blob = new Blob([buffer], { type: mime })
  return watermarkImageBlob(blob, mime, opts)
}

export async function watermarkImageBlob(blob, mime = 'image/png', opts = {}) {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    drawWatermark(ctx, canvas.width, canvas.height, opts)

    const outMime = mime === 'image/jpeg' ? 'image/jpeg'
      : mime === 'image/webp' ? 'image/webp'
      : 'image/png'
    return await canvasToBlob(canvas, outMime, opts.quality ?? 0.92)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Tiles the watermark text across the canvas at a 30° angle.
// Tunables in `opts`: text, color, opacity, fontSize, gap.
function drawWatermark(ctx, w, h, opts) {
  const text = opts.text || 'NOVA · PREVIEW'
  // Scale font with the smaller dimension so it looks consistent on
  // 1080-tall thumbnails and 4K banners alike.
  const fontSize = opts.fontSize ?? Math.max(28, Math.round(Math.min(w, h) * 0.045))
  const color = opts.color || '#ffffff'
  const opacity = opts.opacity ?? 0.22
  const gap = opts.gap ?? Math.round(fontSize * 5)

  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 6) // -30°
  ctx.translate(-w / 2, -h / 2)

  ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  // Soft shadow for legibility on busy art.
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = Math.max(2, fontSize * 0.08)
  ctx.fillStyle = hexWithAlpha(color, opacity)

  // Tile from the rotated-bbox-extended origin so corners are covered.
  const cover = Math.hypot(w, h)
  for (let y = -cover; y < cover * 2; y += gap) {
    for (let x = -cover; x < cover * 2; x += gap * 2) {
      ctx.fillText(text, x, y)
    }
  }

  ctx.restore()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      mime,
      quality,
    )
  })
}

// Convert "#rrggbb" + alpha [0..1] to "rgba(r,g,b,a)".
function hexWithAlpha(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return `rgba(255,255,255,${a})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
