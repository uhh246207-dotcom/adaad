// PsdBuilder — admin tool for authoring PSD templates without
// Photoshop. Produces an output object identical in shape to what
// `parsePsdBuffer()` returns, so the parent page can plug it into
// the same publish flow as an uploaded .psd.
//
// Why this exists:
//   The original admin page only accepted .psd uploads. Many
//   shop-runners don't own Photoshop, so we needed an in-browser
//   authoring tool that still produces layers with the canonical
//   names (text_title, character_png, avt_png…) the customer
//   editor recognises.
//
// What it does NOT do:
//   - It does not write a real .psd file on disk. The output is a
//     "parsed template" — same shape as the parser, no actual PSD
//     bytes are needed downstream.
//   - It does not let the admin draw freehand or import vectors.
//     The toolset is intentionally constrained to the slot roles
//     the customer editor knows how to render: titles, avatar,
//     character cut-out, generic image, logo, etc.
//
// UX flow:
//   1. Pick a preset / size.
//   2. Configure the background (color | gradient | uploaded image).
//   3. Toggle which slots to include and tweak each.
//   4. Click "Tạo template" — parent receives the parsed template
//      and switches to the existing editor view, where the admin
//      can refine locks/labels/fonts/fee and publish to the shop.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sparkles, Palette, Image as ImageIcon, Type, Plus, Check,
  Trash2, Upload, ChevronDown, ChevronUp, Wand2, AlignLeft,
  AlignCenter, AlignRight,
} from 'lucide-react'
import clsx from 'clsx'

import {
  SLOT_PRESETS, scaleSlotsToDoc, rescaleSlots, slotToLayerSpec,
  generateTemplateFromSpec, renderSpecToCanvas,
} from '../../utils/psdGenerator'

const CARD = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(24px) saturate(180%)',
}

// Curated doc-size presets covering the categories the shop sells.
// Sized to match the existing shopstore "ratio" hints.
const DOC_PRESETS = [
  { id: 'thumb-yt',  label: 'Thumbnail YouTube', w: 1280, h: 720,  ratio: '16/9' },
  { id: 'thumb-fb',  label: 'Thumbnail Facebook', w: 1200, h: 630,  ratio: '16/9' },
  { id: 'banner-yt', label: 'Banner YouTube',    w: 2560, h: 1440, ratio: '16/9' },
  { id: 'banner-shop', label: 'Banner Shop',     w: 1500, h: 600,  ratio: '5/2' },
  { id: 'banner-discord', label: 'Banner Discord', w: 1920, h: 480, ratio: '4/1' },
  { id: 'logo',      label: 'Logo vuông',         w: 1024, h: 1024, ratio: '1/1' },
  { id: 'square',    label: 'Vuông Instagram',    w: 1080, h: 1080, ratio: '1/1' },
  { id: 'custom',    label: 'Tuỳ chỉnh…',         w: 1280, h: 720, ratio: '16/9' },
]

// Quick-pick gradient palette that looks decent across categories.
const GRADIENTS = [
  { from: '#6e4bff', to: '#4dd0ff', label: 'Tím · Cyan' },
  { from: '#2bf2c0', to: '#4dd0ff', label: 'Mint · Cyan' },
  { from: '#ff6b6b', to: '#feca57', label: 'Hồng · Vàng' },
  { from: '#0f172a', to: '#1e293b', label: 'Đen tối' },
  { from: '#facc15', to: '#fb923c', label: 'Vàng cam' },
  { from: '#ec4899', to: '#8b5cf6', label: 'Hồng tím' },
]

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => resolve(e.target.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function PsdBuilder({ onCreate, onCancel, toast }) {
  // ── doc dimensions ─────────────────────────────────────────────
  const [docPreset, setDocPreset] = useState('thumb-yt')
  const [width, setWidth]   = useState(1280)
  const [height, setHeight] = useState(720)

  // ── background ────────────────────────────────────────────────
  const [bgKind, setBgKind] = useState('gradient') // color|gradient|image|none
  const [bgColor, setBgColor] = useState('#0e1120')
  const [bgFrom, setBgFrom]   = useState('#6e4bff')
  const [bgTo, setBgTo]       = useState('#4dd0ff')
  const [bgAngle, setBgAngle] = useState(135)
  const [bgImage, setBgImage] = useState(null) // dataUrl

  // ── slots ─────────────────────────────────────────────────────
  // Initialised from defaults at REF size, then scaled to actual
  // doc size on first mount. Subsequent doc-size changes go through
  // `rescaleSlots` so the layout follows.
  const [slots, setSlots] = useState(() =>
    scaleSlotsToDoc(SLOT_PRESETS, 1280, 720)
  )
  const [expandedSlot, setExpandedSlot] = useState(null)
  const [busy, setBusy] = useState(false)

  const previewRef = useRef(null)
  const bgImageInputRef = useRef(null)
  const slotImageInputRef = useRef(null)
  const pendingSlotForUpload = useRef(null)

  // ── doc preset → dims ──────────────────────────────────────────
  // Picking a preset rescales all slots so the relative composition
  // is preserved. Going to "custom" keeps the current dims.
  const handleDocPreset = (id) => {
    const p = DOC_PRESETS.find((x) => x.id === id)
    if (!p) return
    setDocPreset(id)
    if (id === 'custom') return
    const prevW = width, prevH = height
    setWidth(p.w); setHeight(p.h)
    setSlots((prev) => rescaleSlots(prev, prevW, prevH, p.w, p.h))
  }

  const handleCustomDims = (key, val) => {
    const v = Math.max(120, Math.min(8192, parseInt(val, 10) || 0))
    if (key === 'w') {
      setSlots((prev) => rescaleSlots(prev, width, height, v, height))
      setWidth(v)
    } else {
      setSlots((prev) => rescaleSlots(prev, width, height, width, v))
      setHeight(v)
    }
  }

  // ── slot helpers ──────────────────────────────────────────────
  const updateSlot = (id, patch) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const toggleSlot = (id) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }
  const enabledSlots = useMemo(() => slots.filter((s) => s.enabled), [slots])

  // ── live preview spec ─────────────────────────────────────────
  // Re-derived on every state change. Cheap because most fields
  // are primitives; the heavy work is the canvas redraw which
  // happens in the effect below.
  const spec = useMemo(() => {
    const background =
      bgKind === 'color'    ? { kind: 'color', color: bgColor } :
      bgKind === 'gradient' ? { kind: 'gradient', from: bgFrom, to: bgTo, angle: bgAngle } :
      bgKind === 'image'    ? { kind: 'image', dataUrl: bgImage } :
                              { kind: 'none' }
    return {
      width, height,
      background,
      layers: enabledSlots.map(slotToLayerSpec),
    }
  }, [width, height, bgKind, bgColor, bgFrom, bgTo, bgAngle, bgImage, enabledSlots])

  // Re-render the live preview canvas. We bail when the canvas ref
  // isn't ready yet (component just mounted before useEffect runs).
  useEffect(() => {
    if (!previewRef.current) return
    let cancelled = false
    ;(async () => {
      try { await renderSpecToCanvas(spec, previewRef.current) }
      catch (err) {
        if (!cancelled) console.warn('[PsdBuilder] preview render failed', err)
      }
    })()
    return () => { cancelled = true }
  }, [spec])

  // ── image uploads ─────────────────────────────────────────────
  const handleBgImageUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast?.('Chỉ hỗ trợ ảnh', 'error'); return }
    try {
      const url = await readFileAsDataURL(file)
      setBgImage(url)
      setBgKind('image')
    } catch { toast?.('Không đọc được ảnh', 'error') }
  }

  const handleSlotImageUpload = async (file) => {
    if (!file || !pendingSlotForUpload.current) return
    if (!file.type.startsWith('image/')) { toast?.('Chỉ hỗ trợ ảnh', 'error'); return }
    try {
      const url = await readFileAsDataURL(file)
      updateSlot(pendingSlotForUpload.current, { dataUrl: url })
    } catch { toast?.('Không đọc được ảnh', 'error') }
    finally { pendingSlotForUpload.current = null }
  }

  // ── finalise: bake the spec into a parser-compatible template ─
  const handleCreate = async () => {
    if (enabledSlots.length === 0) {
      toast?.('Cần bật ít nhất 1 layer', 'error'); return
    }
    try {
      setBusy(true)
      const template = await generateTemplateFromSpec(spec)
      onCreate?.(template, { width, height })
    } catch (err) {
      console.error(err)
      toast?.('Không tạo được template', 'error')
    } finally {
      setBusy(false)
    }
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
      {/* Live preview */}
      <div className="rounded-2xl overflow-hidden flex flex-col" style={CARD}>
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Wand2 size={14} className="text-violet-300" />
          <span className="text-xs text-white/70 font-semibold">Builder · Tạo PSD bằng tool</span>
          <span className="text-[10px] text-white/30">
            {width}×{height} · {enabledSlots.length} layer
          </span>
          <div className="flex-1" />
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-xl text-xs"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              Đóng
            </button>
          )}
        </div>
        <div className="relative flex-1 min-h-[480px] flex items-center justify-center p-4"
          style={{
            background:
              'repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px, #0c0c14',
          }}>
          <canvas
            ref={previewRef}
            style={{
              maxWidth: '100%', maxHeight: '70vh',
              width: 'auto', height: 'auto',
              boxShadow: '0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
              borderRadius: 8,
              background: '#0e1120',
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Doc size */}
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-brand-300" />
            <h3 className="text-sm font-semibold text-white">Kích thước</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {DOC_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleDocPreset(p.id)}
                className={clsx(
                  'px-3 py-2 rounded-xl text-xs text-left transition-all',
                  docPreset === p.id ? 'text-white' : 'text-white/60 hover:text-white',
                )}
                style={
                  docPreset === p.id
                    ? { background: 'rgba(110,75,255,0.18)', border: '1px solid rgba(110,75,255,0.4)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                }>
                <div className="font-semibold">{p.label}</div>
                <div className="text-[10px] text-white/40">{p.w}×{p.h}</div>
              </button>
            ))}
          </div>
          {docPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Rộng (px)</label>
                <input
                  type="number" min={120} max={8192}
                  value={width}
                  onChange={(e) => handleCustomDims('w', e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Cao (px)</label>
                <input
                  type="number" min={120} max={8192}
                  value={height}
                  onChange={(e) => handleCustomDims('h', e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Background */}
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={14} className="text-cyan-300" />
            <h3 className="text-sm font-semibold text-white">Nền</h3>
          </div>
          <div className="grid grid-cols-4 gap-1 mb-3 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {[
              { id: 'gradient', label: 'Gradient' },
              { id: 'color',    label: 'Màu' },
              { id: 'image',    label: 'Ảnh' },
              { id: 'none',     label: 'Trống' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setBgKind(m.id)}
                className={clsx(
                  'py-1.5 rounded-lg text-[11px] font-medium transition',
                  bgKind === m.id ? 'text-white' : 'text-white/45 hover:text-white',
                )}
                style={bgKind === m.id ? { background: 'rgba(110,75,255,0.25)' } : null}>
                {m.label}
              </button>
            ))}
          </div>

          {bgKind === 'color' && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-12 h-9 rounded cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          )}

          {bgKind === 'gradient' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 mb-1">
                {GRADIENTS.map((g) => (
                  <button
                    key={g.label}
                    onClick={() => { setBgFrom(g.from); setBgTo(g.to) }}
                    className="h-8 rounded-lg overflow-hidden border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                    title={g.label}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <input type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)}
                    className="w-9 h-8 rounded cursor-pointer" />
                  <input type="text" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)}
                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none font-mono" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)}
                    className="w-9 h-8 rounded cursor-pointer" />
                  <input type="text" value={bgTo} onChange={(e) => setBgTo(e.target.value)}
                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none font-mono" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                  Góc nghiêng: {bgAngle}°
                </label>
                <input
                  type="range" min={0} max={360} step={5}
                  value={bgAngle}
                  onChange={(e) => setBgAngle(Number(e.target.value))}
                  className="w-full accent-violet-400"
                />
              </div>
            </div>
          )}

          {bgKind === 'image' && (
            <div>
              <input
                ref={bgImageInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { handleBgImageUpload(e.target.files?.[0]); e.target.value = '' }}
              />
              <button
                onClick={() => bgImageInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(77,208,255,0.1)', border: '1px dashed rgba(77,208,255,0.3)', color: '#4dd0ff' }}>
                <Upload size={12} /> {bgImage ? 'Đổi ảnh nền' : 'Tải ảnh nền'}
              </button>
              {bgImage && (
                <img src={bgImage} alt="bg"
                  className="mt-2 w-full h-24 object-cover rounded-lg border border-white/10" />
              )}
            </div>
          )}
        </div>

        {/* Slot toggles */}
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <Plus size={14} className="text-emerald-300" />
            <h3 className="text-sm font-semibold text-white">Layer</h3>
            <span className="text-[10px] text-white/40 ml-auto">
              {enabledSlots.length} bật / {slots.length}
            </span>
          </div>

          <input
            ref={slotImageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { handleSlotImageUpload(e.target.files?.[0]); e.target.value = '' }}
          />

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {slots.map((slot) => (
              <SlotRow
                key={slot.id}
                slot={slot}
                expanded={expandedSlot === slot.id}
                docW={width} docH={height}
                onToggleEnabled={() => toggleSlot(slot.id)}
                onToggleExpand={() =>
                  setExpandedSlot((cur) => (cur === slot.id ? null : slot.id))
                }
                onChange={(patch) => updateSlot(slot.id, patch)}
                onPickImage={() => {
                  pendingSlotForUpload.current = slot.id
                  slotImageInputRef.current?.click()
                }}
                onClearImage={() => updateSlot(slot.id, { dataUrl: null })}
              />
            ))}
          </div>
        </div>

        {/* Action */}
        <button
          onClick={handleCreate}
          disabled={busy || enabledSlots.length === 0}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)', color: '#fff' }}>
          <Wand2 size={14} /> Tạo template từ tool
        </button>
        <p className="text-[10px] text-white/35 leading-relaxed text-center">
          Sau khi tạo xong, sẽ chuyển sang trình chỉnh sửa quen thuộc để bạn đặt khoá, nhãn, font, phí và đăng cửa hàng.
        </p>
      </div>
    </div>
  )
}

// ── Per-slot row + expanded editor ─────────────────────────────────
function SlotRow({
  slot, expanded, docW, docH,
  onToggleEnabled, onToggleExpand, onChange, onPickImage, onClearImage,
}) {
  const Icon = slot.kind === 'text' ? Type : ImageIcon
  return (
    <div
      className={clsx(
        'rounded-lg overflow-hidden transition-all',
      )}
      style={
        slot.enabled
          ? { background: 'rgba(43,242,192,0.05)', border: '1px solid rgba(43,242,192,0.2)' }
          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
      }>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          onClick={onToggleEnabled}
          className={clsx(
            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition',
            slot.enabled ? 'bg-emerald-400/30' : 'bg-white/[0.05] border border-white/15',
          )}>
          {slot.enabled && <Check size={11} className="text-emerald-300" />}
        </button>
        <Icon size={11} className={slot.enabled ? 'text-emerald-300' : 'text-white/35'} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/85 truncate">{slot.label}</p>
          <p className="text-[9px] text-white/35 font-mono truncate">{slot.id}</p>
        </div>
        {slot.enabled && (
          <button onClick={onToggleExpand}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06]">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {slot.enabled && expanded && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Position + size */}
          <div className="grid grid-cols-4 gap-1.5">
            <NumField label="X" value={slot.x} max={docW}
              onChange={(v) => onChange({ x: v })} />
            <NumField label="Y" value={slot.y} max={docH}
              onChange={(v) => onChange({ y: v })} />
            <NumField label="W" value={slot.w} max={docW}
              onChange={(v) => onChange({ w: Math.max(20, v) })} />
            <NumField label="H" value={slot.h} max={docH}
              onChange={(v) => onChange({ h: Math.max(20, v) })} />
          </div>

          {slot.kind === 'text' && (
            <>
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-wider block mb-1">Nội dung</label>
                <input
                  type="text" value={slot.text || ''}
                  onChange={(e) => onChange({ text: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-white/40 uppercase tracking-wider block mb-1">Cỡ</label>
                  <input
                    type="number" min={8} max={400}
                    value={slot.fontSize || 32}
                    onChange={(e) => onChange({ fontSize: Math.max(8, parseInt(e.target.value, 10) || 0) })}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase tracking-wider block mb-1">Màu</label>
                  <div className="flex items-center gap-1">
                    <input type="color" value={slot.color || '#ffffff'}
                      onChange={(e) => onChange({ color: e.target.value })}
                      className="w-7 h-7 rounded cursor-pointer flex-shrink-0" />
                    <input type="text" value={slot.color || '#ffffff'}
                      onChange={(e) => onChange({ color: e.target.value })}
                      className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[10px] text-white outline-none font-mono" />
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {[
                  { id: 'left',   icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right',  icon: AlignRight },
                ].map(({ id, icon: I }) => (
                  <button
                    key={id}
                    onClick={() => onChange({ align: id })}
                    className={clsx(
                      'flex-1 py-1.5 rounded-lg flex items-center justify-center transition',
                      slot.align === id ? 'text-white' : 'text-white/40 hover:text-white',
                    )}
                    style={
                      slot.align === id
                        ? { background: 'rgba(110,75,255,0.25)' }
                        : { background: 'rgba(255,255,255,0.04)' }
                    }>
                    <I size={11} />
                  </button>
                ))}
              </div>
            </>
          )}

          {slot.kind === 'image' && (
            <div>
              <div className="flex gap-1.5">
                <button
                  onClick={onPickImage}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[10px]"
                  style={{ background: 'rgba(77,208,255,0.1)', border: '1px dashed rgba(77,208,255,0.3)', color: '#4dd0ff' }}>
                  <Upload size={10} className="inline mr-1" />
                  {slot.dataUrl ? 'Đổi ảnh' : 'Ảnh mặc định (tuỳ chọn)'}
                </button>
                {slot.dataUrl && (
                  <button onClick={onClearImage}
                    className="px-2 py-1.5 rounded-lg text-rose-300 hover:bg-rose-500/15"
                    title="Xoá ảnh">
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
              {slot.dataUrl && (
                <img src={slot.dataUrl} alt={slot.label}
                  className={clsx(
                    'mt-1.5 object-cover border border-white/10',
                    slot.shape === 'circle' ? 'rounded-full w-12 h-12' : 'rounded-lg w-full h-16',
                  )}
                />
              )}
              <p className="text-[9px] text-white/35 leading-relaxed mt-1">
                Để trống nếu muốn khách tự upload sau. Layer sẽ hiện placeholder có tên trong preview.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NumField({ label, value, onChange, max }) {
  return (
    <div>
      <label className="text-[9px] text-white/40 uppercase tracking-wider block mb-1">{label}</label>
      <input
        type="number" min={0} max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-1.5 py-1.5 text-[10px] text-white outline-none"
      />
    </div>
  )
}
