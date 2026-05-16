// effectExtractor.js — infer Photoshop layer effects (stroke,
// drop-shadow, outer-glow) from a layer's *rasterised* RGBA bitmap.
//
// We deliberately do NOT read PSD EngineData / Effects descriptors:
// the format is undocumented, version-fragile, and a robust parser
// is its own multi-week project. Sampling the baked pixels gets
// us 80% of visible Photoshop styling for free.
//
// Trade-offs:
//   - Sampling can't recover gradient direction, blur radius
//     beyond ~16 px, or non-uniform stroke widths. We pick the
//     most likely values and let the live editor present them as
//     editable hints rather than ground truth.
//   - For complex shadows (e.g. inner shadow with outer glow),
//     sampling collapses everything to one halo. That's fine —
//     the customer rarely changes shadow colour, only the text.
//
// Public API:
//   extractTextEffects(rgba, w, h) -> {
//     stroke?: { color, width },
//     shadow?: { color, offsetX, offsetY, blur, opacity },
//     glow?:   { color, blur, opacity },
//     gradient?: { from, to, angle },     // text fill gradient
//   }
//
//   extractDominantPalette(rgba, w, h, topN=5) -> [{ rgb, weight }]

// ── Glyph mask ────────────────────────────────────────────────────
// Build a binary mask of "definitely glyph" pixels (alpha ≥ 200)
// and a softer halo mask (alpha 32..199). Returns the bounding box
// of the glyph mask too — many sampling steps need it.
function buildMasks(rgba, w, h) {
  const glyph = new Uint8Array(w * h)
  const halo = new Uint8Array(w * h)
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const a = rgba[i + 3]
      if (a >= 200) {
        glyph[y * w + x] = 1
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      } else if (a >= 32) {
        halo[y * w + x] = a
      }
    }
  }
  return { glyph, halo, bbox: { minX, minY, maxX, maxY } }
}

// ── Stroke detection ──────────────────────────────────────────────
// A stroke is a ring of pixels just outside the glyph that share a
// distinct colour and high opacity. We measure 1-px-thick rings
// expanding outward and look for the first ring where:
//   - 80% of pixels are opaque (alpha ≥ 200), AND
//   - their dominant colour is significantly different from the
//     glyph fill colour.
function detectStroke(rgba, w, h, glyph, glyphFillRgb) {
  const ringSamples = []
  const dist = computeDistanceField(glyph, w, h, /*max*/ 8)
  // Bucket non-glyph pixels by their distance to the nearest glyph
  // pixel (1..8). Each bucket = one "ring".
  const buckets = []
  for (let i = 1; i <= 8; i++) buckets.push({ pixels: [], opaque: 0 })
  for (let i = 0; i < dist.length; i++) {
    const d = dist[i]
    if (d <= 0 || d > 8) continue
    const px = i * 4
    const a = rgba[px + 3]
    const r = rgba[px], g = rgba[px + 1], b = rgba[px + 2]
    const bk = buckets[d - 1]
    bk.pixels.push([r, g, b, a])
    if (a >= 200) bk.opaque++
  }

  let strokeWidth = 0
  let strokeColor = null
  for (let i = 0; i < buckets.length; i++) {
    const bk = buckets[i]
    if (bk.pixels.length < 8) break
    const ratio = bk.opaque / bk.pixels.length
    if (ratio < 0.6) break
    const dom = dominantColour(bk.pixels)
    if (!dom) break
    // Stop if the ring is too similar to the glyph fill (likely
    // anti-alias bleed from the glyph itself, not a real stroke).
    if (colourDistance(dom, glyphFillRgb) < 30 && i === 0) {
      strokeColor = strokeColor || dom // remember tentative anti-alias ring
      continue
    }
    if (!strokeColor) strokeColor = dom
    strokeWidth = i + 1
  }
  if (strokeWidth >= 1 && strokeColor) {
    return { color: rgbToHex(strokeColor), width: strokeWidth }
  }
  return null
}

// ── Shadow / glow detection ───────────────────────────────────────
// Halo pixels (alpha 32..199) outside the glyph mask carry the
// shadow/glow signature. We compute:
//   - Centre of mass of halo pixels relative to the glyph centroid
//     → if non-zero, it's a directional drop-shadow (offset + dir);
//     if ~zero, it's an outer glow.
//   - Average halo colour and average opacity.
//   - Halo radius (95th percentile of distance from nearest glyph
//     pixel) → blur estimate.
function detectHalo(rgba, w, h, glyph, halo, glyphBox) {
  let haloCount = 0, haloOpacity = 0
  let sumX = 0, sumY = 0
  let glyphSumX = 0, glyphSumY = 0, glyphCount = 0
  let rSum = 0, gSum = 0, bSum = 0
  const distances = []
  const dist = computeDistanceField(glyph, w, h, 24)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (glyph[idx]) {
        glyphSumX += x; glyphSumY += y; glyphCount++
        continue
      }
      const a = halo[idx]
      if (a < 24) continue
      const px = idx * 4
      // Skip pixels within 1 px of the glyph (anti-alias).
      const d = dist[idx]
      if (d <= 1) continue
      haloCount++
      haloOpacity += a
      sumX += x; sumY += y
      rSum += rgba[px]
      gSum += rgba[px + 1]
      bSum += rgba[px + 2]
      distances.push(d)
    }
  }

  if (haloCount < 8 || glyphCount < 4) return null

  const avgA = haloOpacity / haloCount / 255
  const haloCenter = { x: sumX / haloCount, y: sumY / haloCount }
  const glyphCenter = { x: glyphSumX / glyphCount, y: glyphSumY / glyphCount }
  const offsetX = Math.round(haloCenter.x - glyphCenter.x)
  const offsetY = Math.round(haloCenter.y - glyphCenter.y)
  const offsetMag = Math.hypot(offsetX, offsetY)

  // Sort distances and pick 90th percentile as blur radius.
  distances.sort((a, b) => a - b)
  const blurR = distances[Math.min(distances.length - 1, Math.floor(distances.length * 0.9))]
  const blur = Math.max(1, Math.round(blurR))

  const color = rgbToHex([
    Math.round(rSum / haloCount),
    Math.round(gSum / haloCount),
    Math.round(bSum / haloCount),
  ])

  // Heuristic: if directional offset > 1.5 px AND > blur*0.4, it's a
  // drop-shadow. Otherwise treat it as an outer glow.
  if (offsetMag >= 1.5 && offsetMag >= blur * 0.4) {
    return {
      kind: 'shadow',
      shadow: {
        color,
        offsetX, offsetY,
        blur,
        opacity: clamp01(avgA * 1.6), // halo alpha gets averaged down by AA — boost a bit
      },
    }
  }
  return {
    kind: 'glow',
    glow: { color, blur, opacity: clamp01(avgA * 1.6) },
  }
}

// ── Gradient detection (fill) ─────────────────────────────────────
// We sample the glyph fill from top→bottom and check whether the
// colour shifts monotonically along an axis. If yes, return a
// 2-stop gradient definition the renderer can apply with
// createLinearGradient.
function detectGradient(rgba, w, h, glyph, glyphBox) {
  const { minX, minY, maxX, maxY } = glyphBox
  if (maxX <= minX || maxY <= minY) return null

  // Vertical scan: average colour per row inside the glyph mask.
  const rows = []
  for (let y = minY; y <= maxY; y++) {
    let r = 0, g = 0, b = 0, n = 0
    for (let x = minX; x <= maxX; x++) {
      if (!glyph[y * w + x]) continue
      const i = (y * w + x) * 4
      r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++
    }
    if (n > 0) rows.push([r / n, g / n, b / n])
  }
  if (rows.length < 4) return null
  const top = rows[0]
  const bot = rows[rows.length - 1]
  const dist = colourDistance(top, bot)
  if (dist < 50) return null // not enough variation to be a gradient

  // Optional: confirm the change is monotonic by checking the mid
  // sample lies between the two endpoints in colour space.
  const mid = rows[Math.floor(rows.length / 2)]
  const expected = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2]
  const off = colourDistance(mid, expected)
  if (off > dist * 0.6) return null // non-linear → likely just multi-tone art

  return {
    from: rgbToHex(top.map(Math.round)),
    to:   rgbToHex(bot.map(Math.round)),
    angle: 90, // top-to-bottom — sampling axis. Renderer accepts deg.
  }
}

// ── Top-level entry ───────────────────────────────────────────────
export function extractTextEffects(rgba, w, h) {
  if (!rgba || w <= 1 || h <= 1) return {}

  const { glyph, halo, bbox } = buildMasks(rgba, w, h)
  if (bbox.maxX < 0) return {} // empty layer

  // Glyph fill colour (centre of mass — least affected by AA).
  const fill = sampleFillColour(rgba, w, h, glyph, bbox)
  if (!fill) return {}

  const out = { fill: rgbToHex(fill) }

  const stroke = detectStroke(rgba, w, h, glyph, fill)
  if (stroke) out.stroke = stroke

  const halo2 = detectHalo(rgba, w, h, glyph, halo, bbox)
  if (halo2?.kind === 'shadow') out.shadow = halo2.shadow
  if (halo2?.kind === 'glow')   out.glow   = halo2.glow

  const gradient = detectGradient(rgba, w, h, glyph, bbox)
  if (gradient) out.gradient = gradient

  return out
}

// Useful for swatches in the layer panel.
export function extractDominantPalette(rgba, w, h, topN = 5) {
  const bins = new Map()
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    // Coarse 5-bit bucket per channel to keep the map small.
    const key = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3)
    bins.set(key, (bins.get(key) || 0) + 1)
  }
  const arr = [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN)
  const total = arr.reduce((s, x) => s + x[1], 0) || 1
  return arr.map(([k, c]) => {
    const r = ((k >> 10) & 0x1f) << 3
    const g = ((k >> 5)  & 0x1f) << 3
    const b = (k & 0x1f) << 3
    return { rgb: rgbToHex([r, g, b]), weight: c / total }
  })
}

// ── Internals ─────────────────────────────────────────────────────

// Compute the L1 (chessboard) distance from each non-glyph pixel
// to the nearest glyph pixel, capped at `max`. We use a simple
// two-pass forward/backward sweep — O(w*h), no heap.
function computeDistanceField(glyph, w, h, max) {
  const INF = max + 1
  const dist = new Int16Array(w * h)
  for (let i = 0; i < dist.length; i++) dist[i] = glyph[i] ? 0 : INF
  // Forward pass.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (dist[i] === 0) continue
      let m = dist[i]
      if (x > 0)         m = Math.min(m, dist[i - 1] + 1)
      if (y > 0)         m = Math.min(m, dist[i - w] + 1)
      if (x > 0 && y > 0) m = Math.min(m, dist[i - w - 1] + 1)
      if (x < w - 1 && y > 0) m = Math.min(m, dist[i - w + 1] + 1)
      dist[i] = Math.min(m, INF)
    }
  }
  // Backward pass.
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (dist[i] === 0) continue
      let m = dist[i]
      if (x < w - 1)         m = Math.min(m, dist[i + 1] + 1)
      if (y < h - 1)         m = Math.min(m, dist[i + w] + 1)
      if (x < w - 1 && y < h - 1) m = Math.min(m, dist[i + w + 1] + 1)
      if (x > 0 && y < h - 1)     m = Math.min(m, dist[i + w - 1] + 1)
      dist[i] = Math.min(m, INF)
    }
  }
  // Convert INF back to max+1 sentinel.
  for (let i = 0; i < dist.length; i++) if (dist[i] > max) dist[i] = max + 1
  return dist
}

function sampleFillColour(rgba, w, h, glyph, bbox) {
  const { minX, minY, maxX, maxY } = bbox
  // Pick the centre 50% region of the glyph bbox — the interior is
  // least affected by anti-aliasing and stroke ring.
  const x0 = Math.round(minX + (maxX - minX) * 0.25)
  const x1 = Math.round(minX + (maxX - minX) * 0.75)
  const y0 = Math.round(minY + (maxY - minY) * 0.25)
  const y1 = Math.round(minY + (maxY - minY) * 0.75)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx = y * w + x
      if (!glyph[idx]) continue
      const i = idx * 4
      r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++
    }
  }
  if (n === 0) return null
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

function dominantColour(pixels) {
  if (!pixels.length) return null
  const bins = new Map()
  for (const [r, g, b] of pixels) {
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    bins.set(key, (bins.get(key) || 0) + 1)
  }
  let bestKey = 0, bestCount = 0
  for (const [k, c] of bins) if (c > bestCount) { bestCount = c; bestKey = k }
  if (bestCount === 0) return null
  const r = ((bestKey >> 8) & 0xf) << 4
  const g = ((bestKey >> 4) & 0xf) << 4
  const b = (bestKey & 0xf) << 4
  return [r, g, b]
}

function colourDistance(a, b) {
  // Crude RGB Euclidean — fine for "are these similar" decisions.
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function rgbToHex([r, g, b]) {
  const h = (n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v }
