// PsdCustomerPage — Canva-style PSD editor for customers.
//
// Layout (desktop):
//   ┌──────────────── top toolbar ─────────────────┐
//   │ ◀ back · title  · zoom · preview · download │
//   ├──────┬───────────────────────┬──────────────┤
//   │ tabs │   Konva canvas        │ Properties   │
//   │ [L]  │   (drag/resize)       │ panel        │
//   │ [T]  │                       │ (selected    │
//   │ [I]  │                       │  layer)      │
//   │ [E]  │                       │              │
//   └──────┴───────────────────────┴──────────────┘
//
// Layout (mobile):
//   header collapses, properties panel becomes a bottom drawer
//   that slides up over the canvas. Layers list is a horizontal
//   scroll strip below the canvas.
//
// Why Konva instead of pure canvas2D?
//   The customer wants Canva-feel: click a layer, see selection
//   handles, drag/resize/rotate with a finger. Doing that on raw
//   canvas means hand-rolling hit-testing + transformer drawing.
//   Konva already does both cleanly and exports back to PNG via
//   stage.toCanvas().
//
// Why we still keep `psdRenderer.renderTemplateToCanvas`:
//   Export goes through the full renderer (4-pass text, gradient,
//   shadow, glow, stroke) at the document's native resolution,
//   not Konva's scaled stage. That gives clean 1:1 PNG/JPG/WebP
//   regardless of zoom.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Download, Loader, RotateCcw, Type, Upload,
  Lock, Image as ImageIcon, Star, AlertCircle, Eye, FileImage,
  Layers, Sliders, Wand2, X, Maximize2, RefreshCw, Sparkles,
  ChevronDown, AlignLeft, AlignCenter, AlignRight, Move,
} from 'lucide-react'
import clsx from 'clsx'

import { renderTemplateToCanvas } from '../utils/psdRenderer'
import { detectLayerRole, isLockLayerName } from '../utils/layerNaming'
import { useFontStore } from '../utils/fontManager'
import { watermarkImageBuffer } from '../utils/watermark'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { useShopStore } from '../store/useShopStore'
import { usePsdStore } from '../store/usePsdStore'

import PsdKonvaEditor, { smartFitDataUrl } from '../components/editor/PsdKonvaEditor'

// ── Export formats ────────────────────────────────────────────────
const EXPORT_FORMATS = [
  { id: 'png',  label: 'PNG',  mime: 'image/png',  ext: 'png',  desc: 'Trong suốt, chất lượng cao' },
  { id: 'jpg',  label: 'JPG',  mime: 'image/jpeg', ext: 'jpg',  desc: 'Nhẹ, không hỗ trợ trong suốt' },
  { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', desc: 'Nhẹ nhất, hỗ trợ trong suốt' },
]

// ── Helpers ───────────────────────────────────────────────────────
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => resolve(e.target.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function canvasToBlob(canvas, mime, quality = 0.92) {
  return new Promise((resolve, reject) => {
    if (mime === 'image/jpeg') {
      // JPG → flatten transparency onto white first.
      const composed = document.createElement('canvas')
      composed.width = canvas.width
      composed.height = canvas.height
      const cctx = composed.getContext('2d')
      cctx.fillStyle = '#ffffff'
      cctx.fillRect(0, 0, composed.width, composed.height)
      cctx.drawImage(canvas, 0, 0)
      composed.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob null')), mime, quality)
      return
    }
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob null')), mime, quality)
  })
}

const valuesKey = (uid, pid) => `nova_psd_values:${uid || 'guest'}:${pid}`
const xformKey  = (uid, pid) => `nova_psd_xforms:${uid || 'guest'}:${pid}`
const loadJson  = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {} } catch { return {} } }
const saveJson  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// ── Tab strip on the left edge ────────────────────────────────────
function TabRail({ active, onChange, hasSelection }) {
  const tabs = [
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'edit',   label: 'Edit',   icon: Type, disabled: !hasSelection },
    { id: 'props',  label: 'Style',  icon: Sliders, disabled: !hasSelection },
  ]
  return (
    <div className="flex md:flex-col gap-1 px-2 md:py-3 md:px-2"
      style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {tabs.map(({ id, label, icon: Icon, disabled }) => (
        <button
          key={id}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={clsx(
            'flex md:flex-col items-center justify-center gap-1 p-2 md:py-3 md:w-16 rounded-xl text-[10px] font-medium transition-all',
            disabled && 'opacity-30 cursor-not-allowed',
            active === id && !disabled
              ? 'text-white'
              : 'text-white/45 hover:text-white hover:bg-white/[0.04]',
          )}
          style={active === id && !disabled ? {
            background: 'rgba(110,75,255,0.18)',
            border: '1px solid rgba(110,75,255,0.3)',
          } : null}>
          <Icon size={16} />
          <span className="hidden md:block">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Layers panel ──────────────────────────────────────────────────
function LayersPanel({ layers, locks, selectedName, onSelect, onReset, customLabels }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <div>
          <h3 className="text-xs font-semibold text-white/85 uppercase tracking-wider">Layers</h3>
          <p className="text-[10px] text-white/35 mt-0.5">{layers.length} layer · click để chọn</p>
        </div>
        <button onClick={onReset}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-white/55 hover:text-white hover:bg-white/[0.06]">
          <RotateCcw size={11} /> Reset
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {layers.map((L) => {
          const role = detectLayerRole(L.name)
          const locked = !!locks?.[L.name] || isLockLayerName(L.name)
          const Icon = L.kind === 'text' ? Type : ImageIcon
          const label = role
            ? (customLabels?.[role.role] || role.label)
            : L.name
          return (
            <button
              key={L.id || L.name}
              onClick={() => !locked && onSelect(L.name)}
              disabled={locked}
              className={clsx(
                'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all',
                locked && 'opacity-50 cursor-not-allowed',
              )}
              style={
                selectedName === L.name && !locked
                  ? { background: 'rgba(110,75,255,0.15)', border: '1px solid rgba(110,75,255,0.35)' }
                  : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }
              }>
              {/* Tiny thumbnail */}
              <div className="w-9 h-9 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {L.bitmapDataUrl ? (
                  <img src={L.bitmapDataUrl} alt={L.name}
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <Icon size={14} className="text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/85 truncate">{label}</p>
                <p className="text-[10px] text-white/35 truncate font-mono">{L.name}</p>
              </div>
              {locked ? (
                <Lock size={11} className="text-rose-400/70 flex-shrink-0" />
              ) : (
                <Icon size={11} className="text-white/30 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Edit panel (text / image content) ─────────────────────────────
function EditPanel({ layer, role, value, onTextChange, onImageChange, onSmartFit, label }) {
  const fileRef = useRef(null)
  if (!layer || !role) return <EmptyState text="Chọn một layer để chỉnh sửa" />

  if (role.type === 'text') {
    return (
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
          <h3 className="text-sm font-semibold text-white truncate">{layer.name}</h3>
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Nội dung</label>
          <textarea
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white outline-none resize-none focus:border-brand-400/60"
            rows={4}
            value={value ?? ''}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={layer.text || 'Nhập nội dung…'}
          />
          <p className="text-[10px] text-white/30 mt-1.5">
            Hỗ trợ xuống dòng (Enter). Hiệu ứng PSD (stroke / shadow / glow / gradient) được giữ tự động.
          </p>
        </div>
        {layer.effects && (
          <div className="rounded-xl p-2.5 space-y-1.5"
            style={{ background: 'rgba(110,75,255,0.06)', border: '1px solid rgba(110,75,255,0.2)' }}>
            <p className="text-[10px] text-violet-300 uppercase tracking-wider font-semibold">
              Hiệu ứng PSD đang giữ
            </p>
            <div className="flex flex-wrap gap-1.5">
              {layer.effects.fill && <Chip label="Fill" color={layer.effects.fill} />}
              {layer.effects.gradient && <Chip label={`Gradient ${layer.effects.gradient.angle}°`} color={layer.effects.gradient.from} />}
              {layer.effects.stroke && <Chip label={`Stroke ${layer.effects.stroke.width}px`} color={layer.effects.stroke.color} />}
              {layer.effects.shadow && <Chip label={`Shadow ${layer.effects.shadow.blur}px`} color={layer.effects.shadow.color} />}
              {layer.effects.glow && <Chip label={`Glow ${layer.effects.glow.blur}px`} color={layer.effects.glow.color} />}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Image layer.
  return (
    <div className="p-4 space-y-3">
      <div>
        <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-sm font-semibold text-white truncate">{layer.name}</h3>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = ''
          if (!f) return
          const url = await readFileAsDataURL(f)
          // Apply smart auto-fit BEFORE handing the dataUrl off, so
          // the renderer can still 'cover' it without re-cropping
          // off-centre (the smart-fit dataUrl is already aspect-
          // matched to the layer).
          const fitted = await smartFitDataUrl(url, layer.width, layer.height).catch(() => url)
          onImageChange(fitted)
        }} />
      <button onClick={() => fileRef.current?.click()}
        className="w-full px-3 py-3 rounded-xl flex items-center gap-2 text-xs"
        style={{ background: 'rgba(77,208,255,0.08)', border: '1px dashed rgba(77,208,255,0.35)', color: '#9ee6ff' }}>
        <Upload size={14} />
        {value ? 'Đổi ảnh khác' : 'Tải ảnh lên'}
      </button>
      {value && (
        <>
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <img src={value} alt="preview" className="w-full max-h-56 object-contain" />
          </div>
          <button onClick={onSmartFit}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(43,242,192,0.08)', border: '1px solid rgba(43,242,192,0.25)', color: '#7ce5c2' }}>
            <Wand2 size={12} /> Auto-fit lại (AI)
          </button>
          <p className="text-[10px] text-white/35 leading-relaxed">
            AI tự nhận diện chủ thể (mặt người / vùng tương phản cao) và crop sao cho chủ thể nằm chính giữa khung.
          </p>
        </>
      )}
    </div>
  )
}

// ── Properties panel (transform + opacity) ────────────────────────
function PropsPanel({ layer, transform, onChange, onReset }) {
  if (!layer) return <EmptyState text="Chọn layer để xem thuộc tính" />
  const t = transform || { x: layer.left, y: layer.top, width: layer.width, height: layer.height, rotation: 0 }
  const num = (k, label, step = 1) => (
    <div>
      <label className="text-[9px] text-white/40 uppercase tracking-wider block mb-1">{label}</label>
      <input
        type="number" step={step}
        value={Math.round(t[k] ?? 0)}
        onChange={(e) => onChange({ ...t, [k]: parseFloat(e.target.value) || 0 })}
        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-brand-400/60"
      />
    </div>
  )
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-wider">Style</p>
          <h3 className="text-sm font-semibold text-white truncate">{layer.name}</h3>
        </div>
        <button onClick={onReset}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06]"
          title="Reset transform">
          <RefreshCw size={12} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">{num('x', 'X')}{num('y', 'Y')}</div>
      <div className="grid grid-cols-2 gap-2">{num('width', 'Width')}{num('height', 'Height')}</div>
      {num('rotation', 'Rotation', 0.5)}
      <div className="rounded-xl px-3 py-2.5 space-y-1"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">Hint</p>
        <p className="text-[11px] text-white/55 leading-relaxed">
          Bạn cũng có thể kéo / xoay / đổi kích thước trực tiếp trên canvas.
        </p>
      </div>
    </div>
  )
}

function Chip({ label, color }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}>
      <span className="w-3 h-3 rounded-full"
        style={{ background: color, border: '1px solid rgba(255,255,255,0.2)' }} />
      {label}
    </span>
  )
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 h-full">
      <Sparkles size={20} className="text-white/20 mb-2" />
      <p className="text-xs text-white/45">{text}</p>
    </div>
  )
}

// ── Pay gate ──────────────────────────────────────────────────────
function PayGate({ open, fee, balance, hasUser, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={onCancel}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'rgba(14,14,24,0.98)', border: '1px solid rgba(110,75,255,0.3)' }}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(110,75,255,0.15)', border: '1px solid rgba(110,75,255,0.3)' }}>
                <Download size={24} className="text-brand-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">Mở khoá tải về</h3>
              <p className="text-sm text-white/50 mt-1">
                Trả {fee} coins một lần — tải mọi định dạng (PNG, JPG, WebP) không watermark, không giới hạn lượt.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
              <span className="text-sm text-white/60">Phí mở khoá</span>
              <div className="flex items-center gap-1.5 font-bold text-yellow-400">
                <Star size={14} className="fill-yellow-400" /> {fee} coins
              </div>
            </div>
            {hasUser && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-white/35">Số dư của bạn</span>
                <span className={balance >= fee ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {balance.toLocaleString('vi-VN')} coins
                </span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/55"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Hủy
              </button>
              <button
                disabled={!hasUser || balance < fee}
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)', color: '#fff' }}>
                Trả {fee} coins
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Format dropdown ───────────────────────────────────────────────
function FormatMenu({ open, onClose, onPick }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl p-1 z-50"
            style={{ background: 'rgba(14,14,24,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 36px rgba(0,0,0,0.5)' }}>
            {EXPORT_FORMATS.map((f) => (
              <button key={f.id}
                onClick={() => { onClose(); onPick(f) }}
                className="w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left hover:bg-white/[0.06]">
                <FileImage size={14} className="text-brand-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-[10px] text-white/40">{f.desc}</p>
                </div>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function PsdCustomerPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const product = useShopStore((s) => s.getProduct(productId))
  const tplId = product?.psdTemplateId
  const template = usePsdStore((s) => tplId ? s.getTemplate(tplId) : null)
  const fontStore = useFontStore()
  const { toast, isOwned } = useAppStore()
  const { user, deductBalance, hasExportPaid, markExportPaid } = useAuthStore()
  const isAdmin = useAuthStore((s) => s.isAdmin())

  const [overrides, setOverrides] = useState(() => loadJson(valuesKey(user?.id, productId)))
  const [transforms, setTransforms] = useState(() => loadJson(xformKey(user?.id, productId)))
  const [activeTab, setActiveTab] = useState('layers')
  const [selectedName, setSelectedName] = useState(null)
  const [busy, setBusy] = useState(false)
  const [busyMsg, setBusyMsg] = useState('')

  const [showPayModal, setShowPayModal] = useState(false)
  const [pendingFormat, setPendingFormat] = useState(null)
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  const fee = template?.exportFee ?? 30
  const allowFreePreview = template?.allowFreePreview !== false
  const watermarkText = template?.watermarkText || 'NOVA · PREVIEW'
  const paid = isAdmin || fee === 0 || hasExportPaid(productId)

  // Persist on every change.
  useEffect(() => {
    if (!productId) return
    saveJson(valuesKey(user?.id, productId), overrides)
  }, [overrides, user?.id, productId])
  useEffect(() => {
    if (!productId) return
    saveJson(xformKey(user?.id, productId), transforms)
  }, [transforms, user?.id, productId])

  // Load custom fonts shipped with the template.
  useEffect(() => {
    if (!template?.fonts?.length) return
    template.fonts.forEach(async (f) => {
      try {
        const res = await fetch(f.dataUrl)
        const buf = await res.arrayBuffer()
        const face = new FontFace(f.family, buf)
        await face.load()
        document.fonts.add(face)
      } catch { /* ignore */ }
    })
  }, [template])

  // Selected layer + its role + override slot.
  const selected = useMemo(() => {
    if (!selectedName || !template?.layers) return null
    return template.layers.find((L) => L.name === selectedName) || null
  }, [selectedName, template])
  const selectedRole = useMemo(() => selected ? detectLayerRole(selected.name) : null, [selected])
  const selectedRoleLabel = useMemo(() => {
    if (!selectedRole) return ''
    return template?.customLabels?.[selectedRole.role] || selectedRole.label
  }, [selectedRole, template])

  // ── Edit handlers ────────────────────────────────────────────
  const setOverride = useCallback((name, patch) => {
    setOverrides((prev) => {
      const next = { ...prev }
      next[name] = { ...(prev[name] || {}), ...patch }
      // Clean up empty entries so the persisted JSON stays small.
      if (!next[name].text && !next[name].imageDataUrl) delete next[name]
      return next
    })
  }, [])

  const setTransform = useCallback((name, t) => {
    setTransforms((prev) => ({ ...prev, [name]: t }))
  }, [])

  const handleTextChange = useCallback((text) => {
    if (!selected) return
    setOverride(selected.name, { text })
  }, [selected, setOverride])

  const handleImageChange = useCallback((dataUrl) => {
    if (!selected) return
    setOverride(selected.name, { imageDataUrl: dataUrl })
  }, [selected, setOverride])

  const handleSmartRefit = useCallback(async () => {
    if (!selected) return
    const cur = overrides[selected.name]?.imageDataUrl
    if (!cur) return
    try {
      setBusy(true); setBusyMsg('AI đang tự căn ảnh…')
      const fitted = await smartFitDataUrl(cur, selected.width, selected.height)
      setOverride(selected.name, { imageDataUrl: fitted })
      toast('Đã auto-fit lại', 'success')
    } catch (e) {
      console.error(e); toast('Không auto-fit được', 'error')
    } finally { setBusy(false); setBusyMsg('') }
  }, [selected, overrides, setOverride, toast])

  const handleResetTransform = useCallback(() => {
    if (!selected) return
    setTransforms((prev) => {
      const next = { ...prev }
      delete next[selected.name]
      return next
    })
    toast('Đã reset vị trí', 'success')
  }, [selected, toast])

  const handleResetAll = useCallback(() => {
    setOverrides({})
    setTransforms({})
    saveJson(valuesKey(user?.id, productId), {})
    saveJson(xformKey(user?.id, productId), {})
    toast('Đã reset toàn bộ', 'success')
  }, [user?.id, productId, toast])

  // ── Selection management ─────────────────────────────────────
  const handleSelect = useCallback((name) => {
    setSelectedName(name)
    if (name) {
      const layer = template?.layers?.find((L) => L.name === name)
      const role = layer ? detectLayerRole(layer.name) : null
      // Auto-jump to the most useful tab on selection.
      if (role) setActiveTab('edit')
      else setActiveTab('props')
      setMobilePanelOpen(true)
    }
  }, [template])

  // ── Export ───────────────────────────────────────────────────
  const renderForExport = useCallback(async () => {
    // We render at the doc's native resolution by feeding the
    // renderer the template + overrides directly. Transforms (drag
    // / resize / rotate) come from `transforms` and get applied as
    // override-time bounds before render.
    const customLayers = template.layers.map((L) => {
      const t = transforms[L.name]
      if (!t) return L
      return {
        ...L,
        left: t.x ?? L.left,
        top: t.y ?? L.top,
        width: t.width ?? L.width,
        height: t.height ?? L.height,
        // Note: Konva rotation isn't trivially baked into renderer
        // because the renderer is rectangular. We rotate via a
        // wrapper canvas: see exportWithRotations below.
      }
    })

    const hasAnyRotation = Object.values(transforms).some((t) => Math.abs(t?.rotation || 0) > 0.01)
    if (!hasAnyRotation) {
      const c = document.createElement('canvas')
      await renderTemplateToCanvas(
        { width: template.width, height: template.height, layers: customLayers },
        overrides, { target: c },
      )
      return c
    }

    // Rotation path: render each layer to an offscreen canvas,
    // rotate via context.rotate() around its centre, then composite
    // the rotated chip onto the master canvas. This preserves
    // shadow/glow/stroke baked into per-layer renders.
    const master = document.createElement('canvas')
    master.width = template.width; master.height = template.height
    const mctx = master.getContext('2d')
    // Reverse so we draw bottom-up in PSD order.
    const drawList = customLayers.slice().reverse()
    for (const L of drawList) {
      if (L.hidden) continue
      const t = transforms[L.name]
      const rot = t?.rotation || 0
      const tile = document.createElement('canvas')
      tile.width = L.width; tile.height = L.height
      // Render this layer in isolation at (0,0).
      await renderTemplateToCanvas(
        { width: L.width, height: L.height, layers: [{ ...L, left: 0, top: 0 }] },
        overrides, { target: tile },
      )
      mctx.save()
      const cx = L.left + L.width / 2
      const cy = L.top + L.height / 2
      mctx.translate(cx, cy)
      if (rot) mctx.rotate((rot * Math.PI) / 180)
      mctx.drawImage(tile, -L.width / 2, -L.height / 2, L.width, L.height)
      mctx.restore()
    }
    return master
  }, [template, overrides, transforms])

  const baseFileName = useCallback(
    () => (product?.title || 'nova').toLowerCase().replace(/\s+/g, '-'),
    [product],
  )

  const performPreviewExport = useCallback(async () => {
    if (!allowFreePreview) { toast('Admin đã tắt xem thử', 'warn'); return }
    try {
      setBusy(true); setBusyMsg('Đang tạo bản xem thử có watermark…')
      const canvas = await renderForExport()
      const pngBlob = await canvasToBlob(canvas, 'image/png')
      const buf = await pngBlob.arrayBuffer()
      const wmBlob = await watermarkImageBuffer(buf, 'image/png', { text: watermarkText })
      downloadBlob(wmBlob, `${baseFileName()}-preview-${Date.now()}.png`)
      toast('Đã tải bản xem thử', 'success')
    } catch (e) { console.error(e); toast(e?.message || 'Lỗi xuất ảnh', 'error') }
    finally { setBusy(false); setBusyMsg('') }
  }, [allowFreePreview, renderForExport, watermarkText, baseFileName, toast])

  const performPaidExport = useCallback(async (format) => {
    try {
      setBusy(true); setBusyMsg(`Đang xuất ${format.label}…`)
      const canvas = await renderForExport()
      const blob = await canvasToBlob(canvas, format.mime)
      downloadBlob(blob, `${baseFileName()}-${Date.now()}.${format.ext}`)
      toast(`Đã tải ${format.label}`, 'success')
    } catch (e) { console.error(e); toast(e?.message || 'Lỗi xuất ảnh', 'error') }
    finally { setBusy(false); setBusyMsg('') }
  }, [renderForExport, baseFileName, toast])

  const handleDownloadClick = useCallback((format) => {
    if (paid) { performPaidExport(format); return }
    setPendingFormat(format); setShowPayModal(true)
  }, [paid, performPaidExport])

  const handlePayConfirm = useCallback(() => {
    if (!user) { toast('Vui lòng đăng nhập', 'warn'); return }
    if (!deductBalance(fee)) { toast('Số dư không đủ', 'error'); return }
    markExportPaid(productId)
    setShowPayModal(false)
    toast('Đã mở khoá, đang xuất ảnh…', 'success')
    performPaidExport(pendingFormat || EXPORT_FORMATS[0])
    setPendingFormat(null)
  }, [user, deductBalance, markExportPaid, fee, productId, pendingFormat, performPaidExport, toast])

  // ── Guards ───────────────────────────────────────────────────
  if (!product) return <Guard icon={<AlertCircle size={32} className="text-rose-400" />} title="Sản phẩm không tồn tại" />
  if (!isOwned(productId) && !isAdmin) return <Guard icon={<Star size={32} className="text-brand-400" />} title="Bạn chưa sở hữu sản phẩm này" />
  if (!template || !template.layers?.length)
    return (
      <Guard
        icon={<AlertCircle size={32} className="text-amber-400" />}
        title="Template không khả dụng"
        desc="Admin chưa đăng PSD cho sản phẩm này, hoặc dữ liệu đã bị trình duyệt loại bỏ vì quá lớn để lưu trữ."
      />
    )

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#0a0a14' }}>
      {/* Top toolbar */}
      <header className="flex items-center gap-2 px-3 md:px-4 py-2.5 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => navigate('/shop')}
          className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06]">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">PSD Editor</p>
            {paid && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{ background: 'rgba(43,242,192,0.15)', color: 'rgba(43,242,192,1)', border: '1px solid rgba(43,242,192,0.3)' }}>
                ĐÃ MỞ KHOÁ
              </span>
            )}
          </div>
          <h1 className="text-sm font-semibold text-white truncate">{product.title}</h1>
        </div>

        {!paid && allowFreePreview && (
          <button onClick={performPreviewExport} disabled={busy}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
            <Eye size={12} /> Xem thử
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowFormatMenu((v) => !v)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)', color: '#fff' }}>
            <Download size={13} />
            <span className="hidden sm:inline">{paid ? 'Tải về' : `Tải về (${fee} ⭐)`}</span>
            <span className="sm:hidden">{paid ? 'Tải' : `${fee}⭐`}</span>
            <ChevronDown size={11} />
          </button>
          <FormatMenu
            open={showFormatMenu}
            onClose={() => setShowFormatMenu(false)}
            onPick={handleDownloadClick}
          />
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Tab rail (desktop) */}
        <div className="hidden md:flex">
          <TabRail active={activeTab} onChange={setActiveTab} hasSelection={!!selected} />
        </div>

        {/* Side panel (desktop) */}
        <aside className="hidden md:block flex-shrink-0 overflow-hidden"
          style={{ width: 320, background: 'rgba(255,255,255,0.025)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          {activeTab === 'layers' && (
            <LayersPanel
              layers={template.layers}
              locks={template.locks}
              customLabels={template.customLabels}
              selectedName={selectedName}
              onSelect={handleSelect}
              onReset={handleResetAll}
            />
          )}
          {activeTab === 'edit' && (
            <EditPanel
              layer={selected}
              role={selectedRole}
              label={selectedRoleLabel}
              value={selectedRole?.type === 'text'
                ? overrides[selected?.name]?.text ?? ''
                : overrides[selected?.name]?.imageDataUrl}
              onTextChange={handleTextChange}
              onImageChange={handleImageChange}
              onSmartFit={handleSmartRefit}
            />
          )}
          {activeTab === 'props' && (
            <PropsPanel
              layer={selected}
              transform={selected ? transforms[selected.name] : null}
              onChange={(t) => selected && setTransform(selected.name, t)}
              onReset={handleResetTransform}
            />
          )}
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0 relative">
          <PsdKonvaEditor
            template={template}
            overrides={overrides}
            transforms={transforms}
            selectedName={selectedName}
            onSelect={handleSelect}
            onChangeTransform={setTransform}
          />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center z-30"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
              <div className="flex flex-col items-center gap-3">
                <Loader size={28} className="text-violet-300 animate-spin" />
                <p className="text-xs text-white/70">{busyMsg}</p>
              </div>
            </div>
          )}

          {/* Mobile floating tab buttons */}
          <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {[
              { id: 'layers', label: 'Layers', icon: Layers },
              { id: 'edit', label: 'Edit', icon: Type, disabled: !selected },
              { id: 'props', label: 'Style', icon: Sliders, disabled: !selected },
            ].map(({ id, label, icon: Icon, disabled }) => (
              <button
                key={id}
                disabled={disabled}
                onClick={() => { setActiveTab(id); setMobilePanelOpen(true) }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-30',
                  activeTab === id && mobilePanelOpen ? 'text-white' : 'text-white/60',
                )}
                style={{
                  background: activeTab === id && mobilePanelOpen
                    ? 'rgba(110,75,255,0.85)'
                    : 'rgba(20,20,28,0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* Mobile bottom drawer */}
      <AnimatePresence>
        {mobilePanelOpen && (
          <motion.div
            key="mobile-drawer"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="md:hidden fixed inset-x-0 bottom-0 z-40 rounded-t-3xl overflow-hidden"
            style={{
              background: 'rgba(14,14,24,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -12px 36px rgba(0,0,0,0.5)',
              maxHeight: '70vh',
            }}>
            <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white capitalize">
                {activeTab === 'layers' ? 'Layers' : activeTab === 'edit' ? 'Chỉnh sửa' : 'Style'}
              </h3>
              <button onClick={() => setMobilePanelOpen(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {activeTab === 'layers' && (
                <LayersPanel
                  layers={template.layers}
                  locks={template.locks}
                  customLabels={template.customLabels}
                  selectedName={selectedName}
                  onSelect={handleSelect}
                  onReset={handleResetAll}
                />
              )}
              {activeTab === 'edit' && (
                <EditPanel
                  layer={selected}
                  role={selectedRole}
                  label={selectedRoleLabel}
                  value={selectedRole?.type === 'text'
                    ? overrides[selected?.name]?.text ?? ''
                    : overrides[selected?.name]?.imageDataUrl}
                  onTextChange={handleTextChange}
                  onImageChange={handleImageChange}
                  onSmartFit={handleSmartRefit}
                />
              )}
              {activeTab === 'props' && (
                <PropsPanel
                  layer={selected}
                  transform={selected ? transforms[selected.name] : null}
                  onChange={(t) => selected && setTransform(selected.name, t)}
                  onReset={handleResetTransform}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PayGate
        open={showPayModal}
        fee={fee}
        balance={user?.balance ?? 0}
        hasUser={!!user}
        onCancel={() => { setShowPayModal(false); setPendingFormat(null) }}
        onConfirm={handlePayConfirm}
      />
    </div>
  )
}

// Tiny full-screen guard component for the not-owned / no-template /
// not-found states. Kept inline to avoid scattering single-purpose
// components across the codebase.
function Guard({ icon, title, desc }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4"
      style={{ background: '#0a0a14' }}>
      {icon}
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      {desc && <p className="text-sm text-white/50 max-w-sm">{desc}</p>}
      <button onClick={() => navigate('/shop')}
        className="px-4 py-2 rounded-xl text-sm bg-white/10 text-white">
        Về cửa hàng
      </button>
    </div>
  )
}
