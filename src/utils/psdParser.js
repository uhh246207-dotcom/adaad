// psdParser.js — wraps @webtoon/psd to produce a layer model the
// rest of Nova can render and edit *in the browser*, with no
// Photopea iframe in sight.
//
// Public API:
//   parsePsdBuffer(arrayBuffer) -> Promise<{
//     width, height,
//     layers: ParsedLayer[],          // top-down draw order
//     thumbnailDataUrl: string,       // composited preview
//   }>
//
//   ParsedLayer shape:
//     { id, name, kind: 'text'|'image',
//       left, top, width, height,
//       opacity,                       // 0..1
//       hidden, isHiddenInPsd,
//       text,                          // for text layers, original string
//       textColor,                     // best-guess hex from the rasterised text
//       textFontSize,                  // best-guess size in px
//       textAlign,                     // 'left' | 'center' | 'right'
//       bitmapDataUrl,                 // PNG data URL of the rasterised layer
//     }
//
// We deliberately treat text layers as bitmaps + side-channel
// metadata. webtoon/psd exposes EngineData for true type-setting
// info but it's brittle across PSD versions. For the customer
// editor we only need: original copy (placeholder), an approximate
// colour, and approximate font size. When the customer rewrites
// the text, the renderer wipes the original raster and draws fresh
// glyphs using their chosen font + the sampled colour/size.

import Psd from '@webtoon/psd'
import { extractTextEffects } from './effectExtractor'

// ─────────────────────────────────────────────────────────────────
//  Public entry
// ─────────────────────────────────────────────────────────────────
export async function parsePsdBuffer(buffer) {
  const psd = Psd.parse(buffer)

  // psd.layers is the FLAT list of Layer nodes (groups omitted).
  // The order @webtoon/psd returns is BOTTOM-UP (matches the PSD
  // file order: the first layer in the array is the bottom of the
  // stack). We flip it so index 0 = top-most for cleaner rendering
  // semantics in the rest of the codebase.
  const flat = (psd.layers || []).slice()

  const parsed = []
  // Process bottom-up so we keep PSD order, then reverse at the end
  // for top-down draw order.
  for (let i = 0; i < flat.length; i++) {
    const layer = flat[i]
    try {
      const entry = await layerToEntry(layer, i)
      if (entry) parsed.push(entry)
    } catch (err) {
      console.warn('[psdParser] skipping layer', layer?.name, err)
    }
  }

  // Build a thumbnail by composing the document itself. Falls back
  // to a manual stack-up if `psd.composite` throws (some malformed
  // PSDs do).
  let thumbnailDataUrl = null
  try {
    const fullRgba = await psd.composite()
    thumbnailDataUrl = await rgbaToDataUrl(fullRgba, psd.width, psd.height, 'image/png')
  } catch (err) {
    // Compose by stacking parsed layers ourselves.
    thumbnailDataUrl = await composeLayersToDataUrl(parsed, psd.width, psd.height)
  }

  return {
    width: psd.width,
    height: psd.height,
    layers: parsed.reverse(), // top-down
    thumbnailDataUrl,
  }
}

// ─────────────────────────────────────────────────────────────────
//  Per-layer extraction
// ─────────────────────────────────────────────────────────────────
async function layerToEntry(layer, index) {
  // Skip zero-area layers (artboards / adjustment / empty groups
  // sometimes round to 0×0 when composited).
  const w = layer.width | 0
  const h = layer.height | 0
  if (w <= 0 || h <= 0) return null

  // composite() returns a Uint8ClampedArray with RGBA pixels for
  // the layer's own bounds (NOT the document size). The docs are
  // explicit on that — no offsetting required on our side.
  const rgba = await layer.composite(true, false)

  const bitmapDataUrl = await rgbaToDataUrl(rgba, w, h, 'image/png')
  const isText = typeof layer.text === 'string' && layer.text.length > 0

  // Colour / size sampling — only meaningful for text layers, but
  // cheap enough to always run; we just don't surface the values
  // to the form unless kind === 'text'.
  const sample = sampleTextStyle(rgba, w, h)

  // Effect extraction — sample the rasterised bitmap to recover
  // approximations of stroke / drop-shadow / outer-glow / gradient
  // fill. Skipped for image layers because halos around photos are
  // not interpretable as Photoshop layer effects (more often just
  // background bleed). See effectExtractor.js for the heuristics.
  let effects = undefined
  if (isText) {
    try { effects = extractTextEffects(rgba, w, h) }
    catch (err) { console.warn('[psdParser] effects extraction failed', err) }
  }

  return {
    id: `L${index}-${(layer.name || 'layer').replace(/\s+/g, '_')}`,
    name: layer.name || `Layer ${index}`,
    kind: isText ? 'text' : 'image',
    left: layer.left | 0,
    top: layer.top | 0,
    width: w,
    height: h,
    opacity: (layer.composedOpacity ?? layer.opacity / 255) || 1,
    hidden: !!layer.isHidden,
    isHiddenInPsd: !!layer.isHidden,
    text: isText ? layer.text : undefined,
    textColor: isText ? sample.color : undefined,
    textFontSize: isText ? sample.fontSize : undefined,
    textAlign: isText ? sample.align : undefined,
    effects,            // { stroke?, shadow?, glow?, gradient?, fill? }
    bitmapDataUrl,
  }
}

// ─────────────────────────────────────────────────────────────────
//  Helpers — pixel buffers <-> data URLs
// ─────────────────────────────────────────────────────────────────
function rgbaToCanvas(rgba, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // ImageData expects Uint8ClampedArray with rgba pixels — exactly
  // what composite() hands us.
  const imageData = ctx.createImageData(width, height)
  imageData.data.set(rgba)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function rgbaToDataUrl(rgba, width, height, mime = 'image/png') {
  const canvas = rgbaToCanvas(rgba, width, height)
  return canvas.toDataURL(mime)
}

async function composeLayersToDataUrl(parsed, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  // Draw bottom-up — at this stage `parsed` is still bottom-up.
  for (const L of parsed) {
    if (L.hidden) continue
    try {
      const img = await loadImageFromUrl(L.bitmapDataUrl)
      ctx.globalAlpha = L.opacity ?? 1
      ctx.drawImage(img, L.left, L.top, L.width, L.height)
    } catch { /* ignore broken layer */ }
  }
  ctx.globalAlpha = 1
  return canvas.toDataURL('image/png')
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// ─────────────────────────────────────────────────────────────────
//  Text style sampling
// ─────────────────────────────────────────────────────────────────
// Why sample instead of reading `textProperties`?
//   `textProperties` gives Photoshop EngineData, which is a deeply
//   nested, undocumented format. Across PSD versions and creators,
//   the offsets and key names shift; a robust extractor is its own
//   project. Sampling the rasterised glyphs gives us a "good
//   enough" colour and size in O(w*h) and works on every PSD.
//
// We compute:
//   - color: dominant non-transparent RGB, mode-quantised to 4 bits
//   - fontSize: estimated cap height = bounding-box height of the
//     opaque glyph rows, with a fudge factor of ~0.85 to account
//     for ascenders/descenders. Rounded to the nearest even number.
//   - align: which third of the bounding box has the most glyph
//     mass (left / center / right).
function sampleTextStyle(rgba, w, h) {
  const bins = new Map()
  let firstRow = -1, lastRow = -1
  // Per-third opaque pixel mass for alignment guess.
  let leftMass = 0, midMass = 0, rightMass = 0
  const third = Math.max(1, Math.floor(w / 3))

  for (let y = 0; y < h; y++) {
    let rowHasOpaque = false
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const a = rgba[i + 3]
      if (a < 32) continue
      rowHasOpaque = true
      const r = rgba[i] & 0xf0
      const g = rgba[i + 1] & 0xf0
      const b = rgba[i + 2] & 0xf0
      const key = (r << 16) | (g << 8) | b
      bins.set(key, (bins.get(key) || 0) + 1)
      if (x < third) leftMass++
      else if (x < 2 * third) midMass++
      else rightMass++
    }
    if (rowHasOpaque) {
      if (firstRow === -1) firstRow = y
      lastRow = y
    }
  }

  let bestKey = 0, bestCount = 0
  for (const [k, c] of bins) {
    if (c > bestCount) { bestCount = c; bestKey = k }
  }
  const r = (bestKey >> 16) & 0xff
  const g = (bestKey >> 8) & 0xff
  const b = bestKey & 0xff
  const color = bestCount > 0 ? rgbToHex(r, g, b) : '#111111'

  // fontSize ≈ glyph bounding box height / 0.85 (cap-height ratio
  // for most western fonts). Floor at 12 so tiny PSDs don't end up
  // with a 4 px font.
  const glyphHeight = firstRow === -1 ? h : (lastRow - firstRow + 1)
  const fontSize = Math.max(12, Math.round((glyphHeight / 0.85) / 2) * 2)

  let align = 'center'
  const total = leftMass + midMass + rightMass
  if (total > 0) {
    const lf = leftMass / total
    const rf = rightMass / total
    if (lf > rf + 0.15) align = 'left'
    else if (rf > lf + 0.15) align = 'right'
  }

  return { color, fontSize, align }
}

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}
