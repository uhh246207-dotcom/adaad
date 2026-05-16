import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Search, ShoppingBag, Coins, Calendar,
  Archive, ImageIcon, FileType, Star, ExternalLink,
  PackageOpen, Filter, Image as ImgIcon,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useShopStore } from '../store/useShopStore'
import { useAppStore, downloadAsset } from '../store/useAppStore'
import GuideSection from '../components/ui/GuideSection'
import clsx from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Static fallback catalog — these are the products hard-coded in ShopPage.
// We keep a thin copy here so users can always see something to download
// even when the storefront's `useShopStore` is empty (fresh browser).
// In a real backend, we'd just hit GET /products/owned.
// ─────────────────────────────────────────────────────────────────────────────
const SHOP_FALLBACK = [
  { id:'th-01', title:'Gaming Thumbnail · Neon',     category:'thumbnail', tag:'YT Gaming', price:80000,  ratio:'16/9', gradient:'linear-gradient(135deg,#ff2e63,#7c5cff,#08d9d6)',     icon:'▶' },
  { id:'th-02', title:'Vlog Thumbnail · Cinematic',  category:'thumbnail', tag:'Vlog',      price:60000,  ratio:'16/9', gradient:'linear-gradient(135deg,#ffb56b,#ff5edb)',              icon:'✈' },
  { id:'th-03', title:'Animated Thumbnail · Motion', category:'thumbnail', tag:'Motion',    price:150000, ratio:'16/9', gradient:'linear-gradient(135deg,#00f5a0,#00d9f5,#7c5cff)',      icon:'✦' },
  { id:'lg-01', title:'Minimal Logo · Mono',         category:'logo',      tag:'Mono',      price:120000, ratio:'1/1',  gradient:'linear-gradient(135deg,#1a1a2e,#4dd0ff)',              icon:'N' },
  { id:'lg-02', title:'Animated Logo · Reveal',      category:'logo',      tag:'Lottie',    price:220000, ratio:'1/1',  gradient:'linear-gradient(135deg,#7c5cff,#ff5edb)',              icon:'✦' },
  { id:'lg-03', title:'Esport Logo · Mascot',        category:'logo',      tag:'Esport',    price:180000, ratio:'1/1',  gradient:'linear-gradient(135deg,#ff2e63,#ffd166)',              icon:'⚔' },
  { id:'bs-01', title:'Shopee Banner · Sale Flash',  category:'banner-shop', tag:'Sale',    price:100000, ratio:'5/2',  gradient:'linear-gradient(135deg,#ff5e62,#ff9966)',              icon:'🛍' },
  { id:'bs-02', title:'Shop Banner · Animated GIF',  category:'banner-shop', tag:'GIF',     price:180000, ratio:'5/2',  gradient:'linear-gradient(135deg,#2bf2c0,#4dd0ff,#7c5cff)',     icon:'⚡' },
  { id:'yt-01', title:'YouTube Banner · Tech',       category:'banner-youtube', tag:'Tech', price:120000, ratio:'16/9', gradient:'linear-gradient(135deg,#0f2027,#2c5364,#00d9f5)',     icon:'▶' },
  { id:'yt-02', title:'YouTube Banner · Animated',   category:'banner-youtube', tag:'Motion', price:200000, ratio:'16/9', gradient:'linear-gradient(135deg,#ff2e63,#7c5cff,#08d9d6)',  icon:'✦' },
  { id:'dc-01', title:'Discord Banner · Aesthetic',  category:'banner-discord', tag:'Aesthetic', price:90000, ratio:'3/1', gradient:'linear-gradient(135deg,#5865f2,#7c5cff,#ff5edb)', icon:'#' },
  { id:'dc-02', title:'Discord Banner · Live Gradient', category:'banner-discord', tag:'Live', price:160000, ratio:'3/1', gradient:'linear-gradient(135deg,#2bf2c0,#4dd0ff,#7c5cff,#ff5edb)', icon:'✦' },
]

// Mirrors the SourcePage catalog so owned source products show up here too.
const SOURCE_FALLBACK = [
  { id:'src-react-dashboard', title:'React Admin Dashboard',  category:'source', stack:['React'],   price:290000, fileType:'zip', fileSize:'4.2 MB', gradient:'linear-gradient(135deg,#61dafb,#7c3aed)', fileUrl:'data:text/plain;base64,UmVhY3QgQWRtaW4gRGFzaGJvYXJkIGJ1bmRsZQ==' },
  { id:'src-nextjs-shop',     title:'Next.js E-commerce Starter', category:'source', stack:['Next'], price:450000, fileType:'zip', fileSize:'6.8 MB', gradient:'linear-gradient(135deg,#000,#646cff)',     fileUrl:'data:text/plain;base64,TmV4dC5qcyBlLWNvbW1lcmNlIHN0YXJ0ZXIgYnVuZGxl' },
  { id:'src-vue-portfolio',   title:'Vue 3 Portfolio Template',   category:'source', stack:['Vue'], price:0,      fileType:'zip', fileSize:'2.1 MB', gradient:'linear-gradient(135deg,#42b883,#34495e)',  fileUrl:'data:text/plain;base64,VnVlIDMgcG9ydGZvbGlvIHN0YXJ0ZXIgY29kZQ==', free:true },
  { id:'src-rn-chat',         title:'React Native Chat App',      category:'source', stack:['RN'],  price:380000, fileType:'zip', fileSize:'8.3 MB', gradient:'linear-gradient(135deg,#FF6B6B,#7c3aed)',   fileUrl:'data:text/plain;base64,UmVhY3QgTmF0aXZlIGNoYXQgYnVuZGxl' },
  { id:'src-flutter-banking', title:'Flutter Banking UI Kit',     category:'source', stack:['Flutter'], price:320000, fileType:'zip', fileSize:'12.7 MB', gradient:'linear-gradient(135deg,#02569B,#13B9FD)', fileUrl:'data:text/plain;base64,Rmx1dHRlciBiYW5raW5nIFVJIGtpdA==' },
  { id:'src-discord-bot',     title:'Discord Bot Boilerplate',    category:'source', stack:['Node'], price:150000, fileType:'zip', fileSize:'1.8 MB', gradient:'linear-gradient(135deg,#5865f2,#1a1a2e)',  fileUrl:'data:text/plain;base64,RGlzY29yZCBib3QgYm9pbGVycGxhdGU=' },
  { id:'src-ai-chatgpt-clone', title:'ChatGPT Clone với GPT-4',   category:'source', stack:['Next','OpenAI'], price:550000, fileType:'zip', fileSize:'5.4 MB', gradient:'linear-gradient(135deg,#10a37f,#0d8b6c)', fileUrl:'data:text/plain;base64,Q2hhdEdQVCBjbG9uZSBidW5kbGU=' },
  { id:'src-image-upscaler',  title:'AI Image Upscaler',          category:'source', stack:['ONNX'], price:0,      fileType:'zip', fileSize:'3.5 MB', gradient:'linear-gradient(135deg,#06b6d4,#22d3ee)',  fileUrl:'data:text/plain;base64,QUkgaW1hZ2UgdXBzY2FsZXIgYnVuZGxl', free:true },
  { id:'src-vscode-theme',    title:'VSCode Theme Pack — Cyber',  category:'source', stack:['VSCode'], price:50000, fileType:'zip', fileSize:'0.3 MB', gradient:'linear-gradient(135deg,#ff2e63,#7c5cff,#08d9d6)', fileUrl:'data:text/plain;base64,VlNDb2RlIHRoZW1lIGN5YmVy' },
]

const FORMATS = [
  { value: 'png',  label: 'PNG',  icon: ImgIcon,  color: '#10b981' },
  { value: 'jpg',  label: 'JPG',  icon: ImageIcon, color: '#ec4899' },
  { value: 'webp', label: 'WebP', icon: FileType, color: '#22d3ee' },
]

// Friendly category label for display
const CAT_LABELS = {
  thumbnail: 'Thumbnail',
  logo: 'Logo',
  'banner-shop': 'Banner Shop',
  'banner-youtube': 'Banner YouTube',
  'banner-discord': 'Banner Discord',
  source: 'Mã nguồn',
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
function DownloadCard({ product, downloadCount, lastAt, onDownload }) {
  const [exporting, setExporting] = useState(false)
  const isSource = product.category === 'source'

  const handleQuickDownload = async () => {
    setExporting(true)
    await onDownload(product)
    setExporting(false)
  }

  const handleFormatExport = async (fmt) => {
    setExporting(true)
    try {
      // Render the gradient/preview into a canvas at format `fmt`. This is
      // a *demo* export — in production we'd render the real PSD or fetch
      // the original asset. For the static demo gradients we just paint
      // a high-res version so the download looks plausible.
      const canvas = document.createElement('canvas')
      const w = product.ratio === '1/1'  ? 1024
              : product.ratio === '5/2'  ? 1500
              : product.ratio === '3/1'  ? 1500
              : 1280
      const h = product.ratio === '1/1'  ? 1024
              : product.ratio === '5/2'  ? 600
              : product.ratio === '3/1'  ? 500
              : 720
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      // Crude gradient parser — extracts hex values from the CSS string.
      const colors = (product.gradient || '').match(/#[0-9a-f]{6}/gi) || ['#222', '#444']
      const grad = ctx.createLinearGradient(0, 0, w, h)
      colors.forEach((c, i) => grad.addColorStop(i / Math.max(1, colors.length - 1), c))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
      // Watermark text
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `bold ${Math.round(h * 0.06)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(product.title, w / 2, h / 2)
      ctx.font = `${Math.round(h * 0.035)}px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillText(`${w}×${h} · NOVA AI Studio`, w / 2, h / 2 + h * 0.08)

      const mime = fmt === 'jpg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png'
      const dataUrl = canvas.toDataURL(mime, 0.92)
      const safeName = product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
      await downloadAsset(dataUrl, `${safeName}.${fmt}`)
      // Record in store
      onDownload({ ...product, _silent: true })
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="group relative flex flex-col rounded-2xl overflow-hidden h-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        transition: 'border-color .3s, box-shadow .3s',
      }}
    >
      {/* Preview */}
      <div className="relative h-32 flex items-center justify-center overflow-hidden"
        style={{ background: product.gradient || 'linear-gradient(135deg,#222,#444)' }}>
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 75% 50% at 50% 0%, rgba(255,255,255,0.15), transparent 60%)' }} />
        <span className="text-5xl font-bold text-white/85 z-10 select-none drop-shadow-lg">
          {isSource ? '</>' : product.icon || '✦'}
        </span>
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
            {CAT_LABELS[product.category] || product.category}
          </span>
        </div>
        {downloadCount > 0 && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
            style={{ background: 'rgba(43,242,192,0.85)', color: '#0a0a14' }}>
            <Download size={10} /> {downloadCount}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <div>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1">{product.title}</h3>
          {lastAt > 0 && (
            <p className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
              <Calendar size={9} />
              Lần tải gần nhất: {new Date(lastAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
            </p>
          )}
        </div>

        {/* Action: source bundle vs image formats */}
        {isSource ? (
          <button
            onClick={handleQuickDownload}
            disabled={exporting}
            className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'rgba(43,242,192,0.18)',
              border: '1px solid rgba(43,242,192,0.35)',
              color: 'rgba(110,231,183,1)',
            }}>
            <Archive size={12} /> {exporting ? 'Đang chuẩn bị…' : `Tải bundle ${product.fileSize || ''}`.trim()}
          </button>
        ) : (
          <>
            <p className="text-[10px] text-white/35 uppercase tracking-wider">Định dạng tải xuống</p>
            <div className="grid grid-cols-3 gap-1.5">
              {FORMATS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => handleFormatExport(value)}
                  disabled={exporting}
                  className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: `${color}12`,
                    border: `1px solid ${color}33`,
                    color: color,
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DownloadsPage() {
  const { user } = useAuthStore()
  const { products: storeProducts } = useShopStore()
  const { owned, downloads, downloadProduct } = useAppStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // Build the union of (static catalog + dynamic store) and pick those owned.
  const ownedProducts = useMemo(() => {
    const all = [...SHOP_FALLBACK, ...SOURCE_FALLBACK, ...storeProducts]
    const byId = new Map(all.map(p => [p.id, p]))
    return owned
      .map(id => byId.get(id))
      .filter(Boolean)
  }, [owned, storeProducts])

  const filtered = useMemo(() => {
    return ownedProducts.filter(p => {
      if (filter === 'image' && p.category === 'source') return false
      if (filter === 'source' && p.category !== 'source') return false
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [ownedProducts, filter, search])

  const totalDownloads = useMemo(
    () => Object.values(downloads).reduce((acc, d) => acc + (d.count || 0), 0),
    [downloads],
  )

  // Smart download wrapper — supports the silent flag from format export
  // (so we don't double-show the "downloaded" toast when re-rendering as
  // multi-format files).
  const handleDownload = (product) => {
    if (product._silent) {
      // increment counter only
      const fakeProd = { ...product }
      delete fakeProd._silent
      return useAppStore.getState().recordDownload(fakeProd.id)
    }
    return downloadProduct(product)
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(110,75,255,0.1)', border: '1px solid rgba(110,75,255,0.25)' }}>
          <PackageOpen size={32} className="text-brand-300" />
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">Đăng nhập để xem đã tải</h2>
        <p className="text-sm text-white/40 mb-5 max-w-xs">Tất cả sản phẩm bạn sở hữu sẽ xuất hiện ở đây để tải lại bất cứ lúc nào.</p>
        <Link to="/auth" className="btn-primary px-6 py-2.5 text-sm">Đăng nhập</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-2 badge mb-2">
          <Download size={13} /> Đã tải xuống
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          Tài sản <span className="grad">của bạn</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {ownedProducts.length} sản phẩm — {totalDownloads} lượt tải
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Đã sở hữu',   value: ownedProducts.length,     icon: ShoppingBag, accent: '#7c5cff' },
          { label: 'Tổng lượt tải', value: totalDownloads,          icon: Download,    accent: '#2bf2c0' },
          { label: 'Ảnh thiết kế', value: ownedProducts.filter(p => p.category !== 'source').length, icon: ImageIcon, accent: '#4dd0ff' },
          { label: 'Mã nguồn',     value: ownedProducts.filter(p => p.category === 'source').length,  icon: Archive,   accent: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: `${s.accent}10`,
              border: `1px solid ${s.accent}25`,
              backdropFilter: 'blur(16px)',
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.accent}25`, border: `1px solid ${s.accent}40` }}>
              <s.icon size={16} style={{ color: s.accent }} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-white/45 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {ownedProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <PackageOpen size={48} className="mx-auto mb-4 text-white/20" />
          <p className="text-base text-white/60 mb-1 font-semibold">Chưa có sản phẩm nào</p>
          <p className="text-sm text-white/35 mb-5 max-w-sm mx-auto">
            Mua thumbnail, logo, banner ở Cửa hàng — hoặc lấy bộ code miễn phí ở Mã nguồn.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/shop" className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              <ShoppingBag size={13} /> Vào cửa hàng
            </Link>
            <Link to="/source" className="btn-ghost text-sm px-4 py-2 inline-flex items-center gap-1.5">
              <ExternalLink size={13} /> Khám phá mã nguồn
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Guide */}
          <GuideSection
            title="Hướng dẫn tải xuống"
            subtitle="Tải lại sản phẩm đã mua bất cứ lúc nào — nhiều định dạng, nhiều độ phân giải"
            accent="emerald"
            icon={Download}
            compact
            badgeText="3 lựa chọn"
            steps={[
              { icon: ImageIcon, title: 'Ảnh thiết kế',  desc: 'Click vào nút PNG / JPG / WebP để xuất ngay với độ phân giải cao.', tip: 'Chọn PNG nếu cần trong suốt, WebP để file nhẹ.' },
              { icon: Archive,   title: 'Mã nguồn',      desc: 'Tải bundle .zip kèm tài liệu hướng dẫn và license.',                tip: 'Cập nhật miễn phí 6 tháng cho mỗi sản phẩm.' },
              { icon: Calendar,  title: 'Lịch sử',       desc: 'Hệ thống nhớ số lần tải và thời gian gần nhất cho từng sản phẩm.', tip: 'Bạn có thể tải lại không giới hạn.' },
            ]}
          />

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm trong đã tải..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(110,75,255,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              {[
                { value: 'all',    label: 'Tất cả' },
                { value: 'image',  label: 'Ảnh' },
                { value: 'source', label: 'Mã nguồn' },
              ].map(o => (
                <button key={o.value} onClick={() => setFilter(o.value)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filter === o.value ? 'bg-brand-500/30 text-brand-200' : 'text-white/40 hover:text-white/70')}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <AnimatePresence mode="popLayout">
            <motion.div layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
              {filtered.map(p => (
                <DownloadCard
                  key={p.id}
                  product={p}
                  downloadCount={downloads[p.id]?.count || 0}
                  lastAt={downloads[p.id]?.lastAt || 0}
                  onDownload={handleDownload}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {filtered.length === 0 && (
            <p className="text-center text-sm text-white/30 py-8">Không có sản phẩm nào khớp với bộ lọc.</p>
          )}
        </>
      )}
    </div>
  )
}
