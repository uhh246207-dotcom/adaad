// PsdAdminPage — admin authoring UI for in-browser PSD templates.
//
// Flow:
//   1. Admin uploads a .psd. The bytes are parsed via @webtoon/psd
//      (utils/psdParser) into a flat layer model with PNG bitmaps
//      and sampled text style. No iframe, no third-party host.
//   2. Layers whose name matches a lock_* convention are pre-locked.
//      Admin can toggle locks on any layer.
//   3. Admin can override the customer-facing label per editable
//      role (text_title → "Tên nhân vật"…), upload custom .ttf/.otf
//      fonts that ship with the template, and configure the export
//      fee + watermark for the customer page.
//   4. A live preview canvas re-renders whenever locks/labels change
//      so the admin sees what the customer will see.
//   5. "Đăng lên cửa hàng" persists the template via usePsdStore and
//      registers a matching shop product so customers can buy it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, Upload, FileType, Layers, Type, Lock, Unlock,
  Eye, EyeOff, Loader, AlertCircle, Save, Image as ImageIcon,
  Sparkles, Store, Wand2,
} from 'lucide-react'
import clsx from 'clsx'

import { parsePsdBuffer } from '../utils/psdParser'
import { renderTemplateToCanvas } from '../utils/psdRenderer'
import {
  detectLayerRole, isLockLayerName, lockTargetRole,
  editableTextHint, editableImageHint, LAYER_ROLES,
} from '../utils/layerNaming'
import { useFontStore } from '../utils/fontManager'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { usePsdStore } from '../store/usePsdStore'
import { useShopStore } from '../store/useShopStore'
import PsdBuilder from '../components/admin/PsdBuilder'

const CARD = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(24px) saturate(180%)',
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => resolve(e.target.result)
    r.onerror = reject
    r.readAsArrayBuffer(file)
  })
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => resolve(e.target.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function PsdAdminPage() {
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const { toast } = useAppStore()
  const createTemplate = usePsdStore((s) => s.createTemplate)
  const addProduct = useShopStore((s) => s.addProduct)
  const fontStore = useFontStore()

  const psdInputRef = useRef(null)
  const fontInputRef = useRef(null)
  const previewCanvasRef = useRef(null)

  // Parsed PSD model + raw bytes (kept for the in-memory cache).
  const [psdName, setPsdName] = useState('')
  const [psdBuffer, setPsdBuffer] = useState(null)
  const [parsed, setParsed] = useState(null) // { width, height, layers, thumbnailDataUrl }

  // Per-template policy.
  const [locks, setLocks] = useState({})         // { [layerName]: true }
  const [customLabels, setCustomLabels] = useState({}) // { [roleId]: string }
  const [customFonts, setCustomFonts] = useState([])   // [{family, dataUrl}]
  const [watermarkText, setWatermarkText] = useState('NOVA · PREVIEW')
  const [allowFreePreview, setAllowFreePreview] = useState(true)
  const [exportFee, setExportFee] = useState(30)

  // Shop product metadata.
  const [templateName, setTemplateName] = useState('')
  const [productPrice, setProductPrice] = useState(0)
  const [productDesc, setProductDesc] = useState('')
  const [productCategory, setProductCategory] = useState('thumbnail')

  const [busy, setBusy] = useState(false)
  const [busyMsg, setBusyMsg] = useState('')

  // 'idle' = empty state with two paths (upload | builder)
  // 'builder' = the in-app PSD builder is open
  // Once `parsed` is set we switch to the editor regardless of source.
  const [mode, setMode] = useState('idle')

  // Guard: admins only.
  useEffect(() => {
    if (!isAdmin) navigate('/')
  }, [isAdmin, navigate])

  // ── Builder mode → "fake parse" ───────────────────────────────────
  // The builder hands us an object with the same shape as the parser's
  // output. We feed it through the same setState path so the rest of
  // the component (preview, locks, publish) doesn't know — or care —
  // whether the layers came from a real .psd or an in-app build.
  const handleBuilderCreate = useCallback((template, meta) => {
    if (!template) return
    setPsdName(`Tự tạo · ${template.width}×${template.height}`)
    setPsdBuffer(null) // no source bytes for tool-built templates
    setParsed(template)
    setTemplateName((prev) => prev || `Template ${new Date().toLocaleDateString('vi-VN')}`)
    // Pre-lock by name convention (lock_background from the builder).
    const initialLocks = {}
    for (const L of template.layers) {
      if (isLockLayerName(L.name)) initialLocks[L.name] = true
    }
    setLocks(initialLocks)
    setCustomLabels({})
    setMode('idle')
    toast(`Đã tạo template với ${template.layers.length} layer`, 'success')
  }, [toast])

  // ── PSD upload ─────────────────────────────────────────────────────
  const handlePsdUpload = useCallback(async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.psd')) {
      toast('Chỉ hỗ trợ file .psd', 'error'); return
    }
    if (file.size > 80 * 1024 * 1024) {
      toast('File quá lớn (tối đa 80MB)', 'error'); return
    }
    try {
      setBusy(true); setBusyMsg('Đang đọc file PSD…')
      const buf = await readFileAsArrayBuffer(file)
      setBusyMsg('Đang phân tích layer…')
      // Slight defer so the UI gets a chance to paint the spinner
      // before we hit the synchronous parse.
      await new Promise((r) => setTimeout(r, 16))
      const result = await parsePsdBuffer(buf)
      setPsdName(file.name)
      setPsdBuffer(buf)
      setParsed(result)
      setTemplateName((prev) => prev || file.name.replace(/\.psd$/i, ''))
      // Pre-lock layers whose name implies it.
      const initialLocks = {}
      for (const L of result.layers) {
        if (isLockLayerName(L.name)) initialLocks[L.name] = true
        const target = lockTargetRole(L.name)
        if (target) {
          // Mirror the lock onto the matching editable role layer
          // (so locking lock_avt also disables avt_png on the form).
          const peer = result.layers.find((x) => detectLayerRole(x.name)?.role === target)
          if (peer) initialLocks[peer.name] = true
        }
      }
      setLocks(initialLocks)
      setCustomLabels({})
      toast(`Đã đọc ${result.layers.length} layer từ PSD`, 'success')
    } catch (e) {
      console.error(e)
      toast('Không đọc được file PSD', 'error')
    } finally {
      setBusy(false); setBusyMsg('')
    }
  }, [toast])

  // ── Lock toggle ────────────────────────────────────────────────────
  const toggleLock = useCallback((layerName) => {
    setLocks((prev) => {
      const next = { ...prev }
      if (next[layerName]) delete next[layerName]
      else next[layerName] = true
      return next
    })
  }, [])

  // ── Custom font upload ─────────────────────────────────────────────
  const handleFontUpload = useCallback(async (file) => {
    if (!file) return
    try {
      const family = await fontStore.uploadFont(file)
      if (!family) {
        toast(fontStore.error || 'Không nạp được font', 'error'); return
      }
      const dataUrl = await readFileAsDataURL(file)
      setCustomFonts((prev) => [...prev, { family, dataUrl }])
      toast(`Đã thêm font: ${family}`, 'success')
    } catch (e) {
      console.error(e); toast('Không nạp được font', 'error')
    }
  }, [fontStore, toast])

  // ── Live preview render ────────────────────────────────────────────
  // Re-render whenever the parsed model or any policy changes. Because
  // the admin doesn't edit the layer content here, the overrides arg
  // is empty — we just want to see what the document looks like with
  // the current layers/locks (locks don't affect rendering, but the
  // re-render also picks up custom fonts being registered).
  useEffect(() => {
    if (!parsed || !previewCanvasRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const canvas = previewCanvasRef.current
        await renderTemplateToCanvas(
          { width: parsed.width, height: parsed.height, layers: parsed.layers },
          {},
          { target: canvas },
        )
      } catch (err) {
        console.warn('preview render failed', err)
      }
    })()
    return () => { cancelled = true }
  }, [parsed, customFonts.length])

  // Editable layers = those with a known role AND not currently
  // locked. Used both to drive the customer form preview and to
  // build editableFields metadata for the shop product.
  const editableLayers = useMemo(() => {
    if (!parsed) return []
    return parsed.layers.filter((L) =>
      detectLayerRole(L.name) && !locks[L.name] && !isLockLayerName(L.name)
    )
  }, [parsed, locks])

  // De-dupe by role id so the labels card doesn't repeat itself when
  // the PSD has e.g. both `image_1` and `img_png` (aliases).
  const fieldsByRole = useMemo(() => {
    const out = []
    const seen = new Set()
    for (const L of editableLayers) {
      const r = detectLayerRole(L.name)
      if (!r || seen.has(r.role)) continue
      seen.add(r.role); out.push({ role: r, layer: L })
    }
    return out
  }, [editableLayers])

  // ── Publish ────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!parsed) { toast('Cần upload PSD trước', 'error'); return }
    if (!templateName.trim()) { toast('Cần nhập tên template', 'error'); return }
    try {
      setBusy(true); setBusyMsg('Đang đăng template…')
      // Render a thumbnail for the shop card.
      const tmpCanvas = await renderTemplateToCanvas(
        { width: parsed.width, height: parsed.height, layers: parsed.layers },
        {},
      )
      const thumbnailDataUrl = tmpCanvas.toDataURL('image/png')

      const tpl = createTemplate({
        name: templateName.trim(),
        width: parsed.width,
        height: parsed.height,
        layers: parsed.layers,
        thumbnailDataUrl,
        locks,
        customLabels,
        fonts: customFonts,
        exportFee: Math.max(0, Number(exportFee) || 0),
        watermarkText,
        allowFreePreview,
        psdBuffer,
      })

      addProduct({
        title: templateName.trim(),
        desc: productDesc || 'PSD template — chỉnh sửa trực tiếp trên web.',
        category: productCategory,
        type: 'static',
        price: Math.max(0, Number(productPrice) || 0),
        ratio: ratioFromDims(parsed.width, parsed.height),
        gradient: 'linear-gradient(135deg,#6e4bff,#4dd0ff)',
        icon: '✦',
        tag: 'PSD',
        rating: 5,
        sold: 0,
        previewDataUrl: thumbnailDataUrl,
        images: thumbnailDataUrl ? [thumbnailDataUrl] : [],
        psdTemplateId: tpl.id,
        editableFields: fieldsByRole.map(({ role, layer }) => ({
          role: role.role,
          label: customLabels[role.role] || role.label,
          type: role.type,
          defaultValue: layer.text || '',
        })),
      })
      toast('Đã đăng template lên cửa hàng', 'success')
      navigate('/shop')
    } catch (e) {
      console.error(e); toast('Không đăng được template', 'error')
    } finally {
      setBusy(false); setBusyMsg('')
    }
  }, [
    parsed, templateName, locks, customLabels, customFonts, exportFee,
    watermarkText, allowFreePreview, psdBuffer,
    productPrice, productDesc, productCategory,
    fieldsByRole, createTemplate, addProduct, navigate, toast,
  ])

  if (!isAdmin) return null

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(110,75,255,0.2) 0%, rgba(77,208,255,0.1) 60%, rgba(43,242,192,0.06) 100%)',
          border: '1px solid rgba(110,75,255,0.3)',
          backdropFilter: 'blur(32px) saturate(200%)',
        }}>
        <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(110,75,255,0.3) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex items-center gap-4 flex-wrap">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(110,75,255,0.25)', border: '1px solid rgba(110,75,255,0.4)' }}>
            <Shield size={22} className="text-brand-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-brand-300 uppercase tracking-widest">Admin Panel</span>
            <h1 className="font-display text-2xl font-bold text-white">PSD Template Editor</h1>
            <p className="text-white/45 text-sm mt-0.5">
              Upload PSD, khoá layer, đặt nhãn, thêm font, phí xuất ảnh — đăng lên cửa hàng
            </p>
          </div>
        </div>
      </motion.div>

      {/* Empty state — show two paths: upload existing PSD, or build from scratch with the in-app tool */}
      {!parsed && mode !== 'builder' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-8 text-center" style={CARD}>
            <FileType size={36} className="mx-auto text-white/30 mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Tải file .psd có sẵn</h3>
            <p className="text-white/55 text-xs mb-4">Phù hợp khi bạn đã thiết kế trên Photoshop</p>
            <input
              ref={psdInputRef} type="file" accept=".psd" className="hidden"
              onChange={(e) => handlePsdUpload(e.target.files?.[0])}
            />
            <button
              onClick={() => psdInputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)' }}>
              <Upload size={14} /> Chọn file .psd
            </button>
            <div className="text-[11px] text-white/35 mt-4 leading-relaxed text-left">
              <p>
                <span className="text-white/50">Tên layer text khách sửa được:</span>{' '}
                <code className="text-cyan-300">{editableTextHint()}</code>
              </p>
              <p className="mt-1">
                <span className="text-white/50">Tên layer ảnh khách thay được:</span>{' '}
                <code className="text-cyan-300">{editableImageHint()}</code>
              </p>
              <p className="mt-1">
                <span className="text-white/50">Layer khoá vĩnh viễn:</span>{' '}
                <code className="text-amber-300">lock_background, lock_avt, lock_character, lock_logo, lock_title…</code>
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-8 text-center relative overflow-hidden" style={{
            ...CARD,
            background: 'linear-gradient(135deg, rgba(110,75,255,0.12) 0%, rgba(77,208,255,0.06) 100%)',
            border: '1px solid rgba(110,75,255,0.3)',
          }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(110,75,255,0.25) 0%, transparent 70%)' }} />
            <Wand2 size={36} className="mx-auto text-violet-300 mb-3 relative z-10" />
            <h3 className="text-base font-semibold text-white mb-1 relative z-10">Tạo PSD bằng tool</h3>
            <p className="text-white/55 text-xs mb-4 relative z-10">
              Không cần Photoshop · build trực tiếp trên web
            </p>
            <button
              onClick={() => setMode('builder')}
              disabled={busy}
              className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)' }}>
              <Wand2 size={14} /> Mở builder
            </button>
            <div className="text-[11px] text-white/45 mt-4 leading-relaxed text-left relative z-10">
              <p>· Chọn kích thước & nền (gradient / màu / ảnh)</p>
              <p>· Bật/tắt từng slot: tiêu đề, nhân vật, avatar tròn, logo…</p>
              <p>· Tự sinh layer đúng tên chuẩn để khách chỉnh được</p>
              <p>· Tiếp tục đặt khoá, font, phí và đăng cửa hàng như bình thường</p>
            </div>
          </div>
        </div>
      )}

      {/* Builder mode */}
      {!parsed && mode === 'builder' && (
        <PsdBuilder
          toast={toast}
          onCancel={() => setMode('idle')}
          onCreate={handleBuilderCreate}
        />
      )}

      {/* Editor */}
      {parsed && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
          {/* Preview canvas */}
          <div className="rounded-2xl overflow-hidden flex flex-col" style={CARD}>
            <div className="flex items-center gap-2 px-3 py-2 flex-wrap"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-white/55 truncate max-w-[260px]" title={psdName}>{psdName}</span>
              <span className="text-[10px] text-white/30">{parsed.width}×{parsed.height} · {parsed.layers.length} layer</span>
              {(() => {
                // Quick badge so admins can see at a glance how many
                // text layers carry sampled Photoshop effects (stroke,
                // shadow, glow, gradient). Helps them spot when the
                // PSD's effects didn't extract cleanly.
                const fxCount = parsed.layers.filter(
                  (L) => L.effects && (L.effects.stroke || L.effects.shadow || L.effects.glow || L.effects.gradient),
                ).length
                if (fxCount === 0) return null
                return (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: 'rgba(110,75,255,0.18)', color: '#c4b5fd', border: '1px solid rgba(110,75,255,0.3)' }}>
                    ✨ {fxCount} effect
                  </span>
                )
              })()}
              <div className="flex-1" />
              <button
                onClick={() => psdInputRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                <Upload size={12} /> Đổi PSD
              </button>
              <button
                onClick={() => {
                  // Reset to empty state then open the builder; the
                  // existing locks/labels/fonts cleanly go with it.
                  setParsed(null); setPsdBuffer(null); setPsdName('')
                  setLocks({}); setCustomLabels({})
                  setMode('builder')
                }}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs disabled:opacity-40"
                style={{ background: 'rgba(110,75,255,0.15)', border: '1px solid rgba(110,75,255,0.3)', color: '#c4b5fd' }}>
                <Wand2 size={12} /> Tạo bằng tool
              </button>
              <input
                ref={psdInputRef} type="file" accept=".psd" className="hidden"
                onChange={(e) => handlePsdUpload(e.target.files?.[0])}
              />
            </div>
            <div className="relative flex-1 min-h-[480px] flex items-center justify-center p-4"
              style={{
                background:
                  'repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px, #0c0c14',
              }}>
              <canvas
                ref={previewCanvasRef}
                style={{
                  maxWidth: '100%', maxHeight: '70vh',
                  width: 'auto', height: 'auto',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
                  borderRadius: 8,
                }}
              />
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                  <div className="flex flex-col items-center gap-3">
                    <Loader size={28} className="text-violet-300 animate-spin" />
                    <p className="text-xs text-white/70">{busyMsg}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Layers */}
            <div className="rounded-2xl p-4" style={CARD}>
              <div className="flex items-center gap-2 mb-3">
                <Layers size={14} className="text-brand-300" />
                <h3 className="text-sm font-semibold text-white">Layers</h3>
                <span className="text-[10px] text-white/40 ml-auto">
                  {parsed.layers.length} layer · {Object.keys(locks).length} đã khoá
                </span>
              </div>
              <div className="max-h-[280px] overflow-y-auto pr-1 space-y-1">
                {parsed.layers.map((L) => (
                  <LayerRow
                    key={L.id}
                    layer={L}
                    locked={!!locks[L.name]}
                    onToggleLock={() => toggleLock(L.name)}
                  />
                ))}
              </div>
              <p className="text-[10px] text-white/30 mt-3 leading-relaxed">
                Layer có tên <code className="text-amber-300">lock_*</code> đã được tự động khoá. Bấm vào ổ khoá để mở/khoá thủ công.
              </p>
            </div>

            {/* Custom labels */}
            <div className="rounded-2xl p-4" style={CARD}>
              <div className="flex items-center gap-2 mb-3">
                <Type size={14} className="text-violet-300" />
                <h3 className="text-sm font-semibold text-white">Nhãn hiển thị</h3>
                <span className="text-[10px] text-white/40 ml-auto">cho khách</span>
              </div>
              {fieldsByRole.length === 0 ? (
                <p className="text-[11px] text-white/35 leading-relaxed">
                  Chưa có layer nào có role chuẩn. Đặt tên layer như&nbsp;
                  <code className="text-cyan-300">text_title</code>, <code className="text-cyan-300">character_png</code>… để khách có thể chỉnh sửa.
                </p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {fieldsByRole.map(({ role }) => (
                    <div key={role.role} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/40 w-24 flex-shrink-0 truncate">
                        {role.role}
                      </span>
                      <input
                        className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                        placeholder={role.label}
                        value={customLabels[role.role] ?? ''}
                        onChange={(e) => setCustomLabels((p) => ({ ...p, [role.role]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom fonts */}
            <div className="rounded-2xl p-4" style={CARD}>
              <div className="flex items-center gap-2 mb-3">
                <Type size={14} className="text-cyan-300" />
                <h3 className="text-sm font-semibold text-white">Custom Fonts</h3>
              </div>
              <input
                ref={fontInputRef} type="file" accept=".ttf,.otf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFontUpload(f); e.target.value = '' }}
              />
              <button
                onClick={() => fontInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(77,208,255,0.1)', border: '1px dashed rgba(77,208,255,0.3)', color: '#4dd0ff' }}>
                <Upload size={12} /> Tải font (.ttf / .otf)
              </button>
              {customFonts.length > 0 && (
                <div className="mt-3 space-y-1">
                  {customFonts.map((f) => (
                    <div key={f.family}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-2"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Type size={11} className="text-cyan-300 flex-shrink-0" />
                      <span style={{ fontFamily: f.family }} className="text-white/85 truncate">{f.family}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-white/30 mt-3 leading-relaxed">
                Font được nạp qua FontFace API và đi kèm template. Khách sẽ thấy font khớp với PSD.
              </p>
            </div>

            {/* Watermark + free preview policy */}
            <div className="rounded-2xl p-4" style={CARD}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-300" />
                <h3 className="text-sm font-semibold text-white">Watermark & Preview</h3>
              </div>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowFreePreview}
                  onChange={(e) => setAllowFreePreview(e.target.checked)}
                  className="accent-violet-400"
                />
                <span className="text-xs text-white/70">Cho phép khách tải xem thử (có watermark)</span>
              </label>
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                Nội dung watermark
              </label>
              <input
                disabled={!allowFreePreview}
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none disabled:opacity-40"
                placeholder="NOVA · PREVIEW"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
              />
            </div>

            {/* Publish */}
            <div className="rounded-2xl p-4" style={CARD}>
              <div className="flex items-center gap-2 mb-3">
                <Store size={14} className="text-emerald-300" />
                <h3 className="text-sm font-semibold text-white">Đăng cửa hàng</h3>
              </div>
              <div className="space-y-2.5">
                <input
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white outline-none"
                  placeholder="Tên template *"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <textarea
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
                  rows={2}
                  placeholder="Mô tả ngắn"
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}>
                    <option value="thumbnail">Thumbnail</option>
                    <option value="logo">Logo</option>
                    <option value="banner-shop">Banner Shop</option>
                    <option value="banner-youtube">Banner YT</option>
                    <option value="banner-discord">Banner Discord</option>
                  </select>
                  <input
                    type="number" min={0}
                    className="bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    placeholder="Giá mua (coins)"
                    value={productPrice}
                    onChange={(e) => setProductPrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">
                    Phí xuất ảnh (coins)
                  </label>
                  <input
                    type="number" min={0}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    value={exportFee}
                    onChange={(e) => setExportFee(Number(e.target.value))}
                  />
                </div>
                <button
                  onClick={handlePublish}
                  disabled={busy || !templateName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#2bf2c0,#4dd0ff)', color: '#0a0a14' }}>
                  <Save size={14} /> Đăng lên cửa hàng
                </button>
                <div className="flex items-start gap-2 px-2 py-2 rounded-lg text-[10px]"
                  style={{ background: 'rgba(110,75,255,0.08)', border: '1px solid rgba(110,75,255,0.2)' }}>
                  <AlertCircle size={12} className="text-brand-300 flex-shrink-0 mt-0.5" />
                  <span className="text-white/55 leading-relaxed">
                    Sau khi đăng, khách mua xong sẽ vào trình chỉnh sửa PSD ngay trên web — không cần Photoshop, không có iframe bên thứ ba.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Layer row helper ────────────────────────────────────────────────
// Compact line: kind icon · name (with role badge) · lock toggle.
// Visual emphasis differs for editable / locked / unrecognised so
// the admin can spot at a glance what the customer will see.
function LayerRow({ layer, locked, onToggleLock }) {
  const role = detectLayerRole(layer.name)
  const lockedByName = isLockLayerName(layer.name)
  const Icon = layer.kind === 'text' ? Type : ImageIcon

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all',
      )}
      style={
        locked
          ? { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }
          : role
          ? { background: 'rgba(43,242,192,0.05)', border: '1px solid rgba(43,242,192,0.18)' }
          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }
      }
    >
      <Icon size={11} className={role ? 'text-emerald-300' : 'text-white/30'} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-white/85 truncate font-mono">{layer.name}</p>
        {role && (
          <p className="text-[9px] text-white/40 truncate">
            {role.label} · {role.type}
          </p>
        )}
      </div>
      {/* Effects sparkle: only shown when at least one Photoshop
          effect was successfully sampled. The tooltip lists which
          ones so admins can verify before publishing. */}
      {layer.effects && (layer.effects.stroke || layer.effects.shadow || layer.effects.glow || layer.effects.gradient) && (
        <span
          title={[
            layer.effects.stroke   && `Stroke ${layer.effects.stroke.width}px ${layer.effects.stroke.color}`,
            layer.effects.shadow   && `Shadow ${layer.effects.shadow.blur}px ${layer.effects.shadow.color}`,
            layer.effects.glow     && `Glow ${layer.effects.glow.blur}px ${layer.effects.glow.color}`,
            layer.effects.gradient && `Gradient ${layer.effects.gradient.from}→${layer.effects.gradient.to}`,
          ].filter(Boolean).join(' · ')}
          className="text-[10px] flex-shrink-0"
          style={{ color: '#c4b5fd' }}>
          ✨
        </span>
      )}
      <button
        onClick={onToggleLock}
        title={lockedByName ? 'Layer này được khoá theo tên (lock_*) — admin vẫn có thể mở thủ công' : 'Bấm để khoá / mở khoá'}
        className={clsx(
          'p-1 rounded-md transition-all',
          locked ? 'text-rose-300 hover:bg-rose-500/15' : 'text-white/40 hover:text-white hover:bg-white/[0.06]',
        )}
      >
        {locked ? <Lock size={11} /> : <Unlock size={11} />}
      </button>
    </div>
  )
}

// Pick a coarse "ratio" string for the shop card display from
// document dimensions.
function ratioFromDims(w, h) {
  if (!w || !h) return '16/9'
  const ratio = w / h
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16/9'
  if (Math.abs(ratio - 4 / 3) < 0.1)  return '4/3'
  if (Math.abs(ratio - 1) < 0.1)      return '1/1'
  if (Math.abs(ratio - 5 / 2) < 0.2)  return '5/2'
  if (Math.abs(ratio - 3 / 1) < 0.2)  return '3/1'
  return '16/9'
}
