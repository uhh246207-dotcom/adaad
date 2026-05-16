import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Search, Star, Coins, CheckCircle, Eye, Zap, Lock, Sparkles, Edit2, Trash2, ChevronLeft, ChevronRight, ImagePlus, Filter, MousePointer2, Wand2, Download } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useShopStore } from '../store/useShopStore'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from 'react-router-dom'
import GuideSection from '../components/ui/GuideSection'
import Modal from '../components/ui/Modal'

/* ─── DATA ───────────────────────────────────────────────── */
const PRODUCTS = [
  { id:'th-01', title:'Gaming Thumbnail · Neon',       desc:'Thumbnail YouTube tone neon gaming channel. PSD + Figma.',      category:'thumbnail',      type:'static',   price:80000,  ratio:'16/9', gradient:'linear-gradient(135deg,#ff2e63,#7c5cff,#08d9d6)', icon:'▶', tag:'YT Gaming', rating:4.9, sold:234 },
  { id:'th-02', title:'Vlog Thumbnail · Cinematic',    desc:'Layout cinematic cho vlog du lịch — gradient mềm, typo lớn.',  category:'thumbnail',      type:'static',   price:60000,  ratio:'16/9', gradient:'linear-gradient(135deg,#ffb56b,#ff5edb)',          icon:'✈', tag:'Vlog',      rating:4.8, sold:189 },
  { id:'th-03', title:'Animated Thumbnail · Motion',  desc:'Thumbnail có animation glow & particle — chuẩn video editor.',  category:'thumbnail',      type:'animated', price:150000, ratio:'16/9', gradient:'linear-gradient(135deg,#00f5a0,#00d9f5,#7c5cff)',  icon:'✦', tag:'Motion',    rating:5.0, sold:89,  badge:'HOT' },
  { id:'lg-01', title:'Minimal Logo · Mono',           desc:'Logo monogram tối giản, vector SVG + AI.',                      category:'logo',           type:'static',   price:120000, ratio:'1/1',  gradient:'linear-gradient(135deg,#1a1a2e,#4dd0ff)',          icon:'N', tag:'Mono',      rating:4.7, sold:156 },
  { id:'lg-02', title:'Animated Logo · Reveal',        desc:'Logo animation reveal cho intro video. Lottie + MP4.',          category:'logo',           type:'animated', price:220000, ratio:'1/1',  gradient:'linear-gradient(135deg,#7c5cff,#ff5edb)',          icon:'✦', tag:'Lottie',    rating:4.9, sold:67,  badge:'NEW' },
  { id:'lg-03', title:'Esport Logo · Mascot',          desc:'Logo mascot cho team esport, file vector chỉnh sửa.',           category:'logo',           type:'static',   price:180000, ratio:'1/1',  gradient:'linear-gradient(135deg,#ff2e63,#ffd166)',          icon:'⚔', tag:'Esport',    rating:4.8, sold:102 },
  { id:'bs-01', title:'Shopee Banner · Sale Flash',    desc:'Banner sale flash cho shop Shopee/Lazada, multi-size.',         category:'banner-shop',    type:'static',   price:100000, ratio:'5/2',  gradient:'linear-gradient(135deg,#ff5e62,#ff9966)',          icon:'🛍', tag:'Sale',      rating:4.6, sold:321 },
  { id:'bs-02', title:'Shop Banner · Animated GIF',   desc:'Banner shop động dạng GIF, phù hợp marketplace.',              category:'banner-shop',    type:'animated', price:180000, ratio:'5/2',  gradient:'linear-gradient(135deg,#2bf2c0,#4dd0ff,#7c5cff)', icon:'⚡', tag:'GIF',       rating:4.8, sold:78  },
  { id:'yt-01', title:'YouTube Banner · Tech',         desc:'Channel art cho kênh tech/review, 2560x1440 chuẩn YT.',        category:'banner-youtube', type:'static',   price:120000, ratio:'16/9', gradient:'linear-gradient(135deg,#0f2027,#2c5364,#00d9f5)', icon:'▶', tag:'Tech',      rating:4.7, sold:203 },
  { id:'yt-02', title:'YouTube Banner · Animated',    desc:'Banner YT có hiệu ứng động export MP4 cho intro stream.',       category:'banner-youtube', type:'animated', price:200000, ratio:'16/9', gradient:'linear-gradient(135deg,#ff2e63,#7c5cff,#08d9d6)', icon:'✦', tag:'Motion',    rating:5.0, sold:44,  badge:'HOT' },
  { id:'dc-01', title:'Discord Banner · Aesthetic',   desc:'Banner server Discord aesthetic — soft purple tone.',           category:'banner-discord', type:'static',   price:90000,  ratio:'3/1',  gradient:'linear-gradient(135deg,#5865f2,#7c5cff,#ff5edb)', icon:'#', tag:'Aesthetic', rating:4.8, sold:167 },
  { id:'dc-02', title:'Discord Banner · Live Gradient',desc:'Banner Discord gradient động loop liên tục, xuất GIF.',       category:'banner-discord', type:'animated', price:160000, ratio:'3/1',  gradient:'linear-gradient(135deg,#2bf2c0,#4dd0ff,#7c5cff,#ff5edb)', icon:'✦', tag:'Live', rating:4.9, sold:55 },
]

const CATEGORIES = [
  { value:'all',            label:'Tất cả' },
  { value:'thumbnail',      label:'Thumbnail' },
  { value:'logo',           label:'Logo' },
  { value:'banner-shop',    label:'Banner Shop' },
  { value:'banner-youtube', label:'Banner YouTube' },
  { value:'banner-discord', label:'Banner Discord' },
]
const TYPES = [
  { value:'all',      label:'Tất cả' },
  { value:'static',   label:'Tĩnh' },
  { value:'animated', label:'Động ✦' },
]

/* ─── EDIT PRODUCT MODAL ─────────────────────────────────── */
const EDIT_CATEGORIES = [
  { value: 'thumbnail',      label: 'Thumbnail' },
  { value: 'logo',           label: 'Logo' },
  { value: 'banner-shop',    label: 'Banner Shop' },
  { value: 'banner-youtube', label: 'Banner YouTube' },
  { value: 'banner-discord', label: 'Banner Discord' },
]

function EditProductModal({ open, product, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: '', desc: '', category: 'thumbnail', tag: '',
    price: 0, badge: '', discountCode: '', discountPercent: 0, images: [],
  })

  // Sync form when product changes
  useEffect(() => {
    if (product) {
      setForm({
        title: product.title || '',
        desc: product.desc || '',
        category: product.category || 'thumbnail',
        tag: product.tag || '',
        price: product.price || 0,
        badge: product.badge || '',
        discountCode: product.discountCode || '',
        discountPercent: product.discountPercent || 0,
        images: product.images || [],
      })
    }
  }, [product])

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12,
    color: 'rgba(255,255,255,0.85)',
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    fontSize: 13,
  }
  const labelStyle = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'block',
    marginBottom: 6,
  }

  const handleClose = () => {
    setForm({ title: '', desc: '', category: 'thumbnail', tag: '', price: 0, badge: '', discountCode: '', discountPercent: 0, images: [] })
    onClose()
  }

  const handleSave = () => {
    const totalSize = (form.images || []).reduce((acc, img) => acc + img.length * 0.75, 0)
    if (totalSize > 2 * 1024 * 1024) {
      alert('Tổng dung lượng ảnh quá lớn (>2MB). Vui lòng giảm số lượng hoặc kích thước ảnh.')
      return
    }
    onSave(form)
    setForm({ title: '', desc: '', category: 'thumbnail', tag: '', price: 0, badge: '', discountCode: '', discountPercent: 0, images: [] })
  }

  const handleDelete = () => {
    if (window.confirm('Xác nhận xóa sản phẩm này?')) {
      onDelete(product.id)
    }
  }

  if (!product) return null
  return (
    <Modal open={open} onClose={handleClose} title="Chỉnh sửa sản phẩm" size="md">
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label style={labelStyle}>Tiêu đề *</label>
          <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Mô tả</label>
          <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Danh mục</label>
            <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {EDIT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tag (tối đa 12 ký tự)</label>
            <input style={inputStyle} value={form.tag} maxLength={12} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Giá (coins)</label>
            <input style={inputStyle} type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
          </div>
          <div>
            <label style={labelStyle}>Badge</label>
            <select style={inputStyle} value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}>
              <option value="">Không có</option>
              <option value="NEW">NEW</option>
              <option value="HOT">HOT</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Mã giảm giá</label>
            <input style={inputStyle} value={form.discountCode} onChange={e => setForm(f => ({ ...f, discountCode: e.target.value }))} placeholder="e.g. SALE20" />
          </div>
          <div>
            <label style={labelStyle}>% Giảm (0–100)</label>
            <input style={inputStyle} type="number" min={0} max={100} value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: Number(e.target.value) }))} />
          </div>
        </div>
        {/* Multi-image upload */}
        <div>
          <label style={labelStyle}>Ảnh sản phẩm (slideshow)</label>
          <div className="space-y-2">
            {form.images?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group/img">
                    <img src={img} alt={`img-${i}`} className="w-16 h-12 object-cover rounded-lg"
                      style={{ border: i === 0 ? '1px solid rgba(110,75,255,0.5)' : '1px solid rgba(255,255,255,0.1)' }} />
                    {i === 0 && (
                      <div className="absolute bottom-0 inset-x-0 text-center text-[8px] font-bold rounded-b-lg"
                        style={{ background: 'rgba(110,75,255,0.75)', color: 'white' }}>
                        Chính
                      </div>
                    )}
                    {i !== 0 && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all text-xs"
              style={{ background: 'rgba(110,75,255,0.1)', border: '1px dashed rgba(110,75,255,0.35)', color: 'rgba(167,139,250,0.9)' }}>
              <ImagePlus size={13} /> Thêm ảnh (không giới hạn)
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files)
                  Promise.all(files.map(f => new Promise(resolve => {
                    const reader = new FileReader()
                    reader.onload = ev => resolve(ev.target.result)
                    reader.readAsDataURL(f)
                  }))).then(newImgs => {
                    setForm(prev => ({ ...prev, images: [...(prev.images || []), ...newImgs] }))
                  })
                  e.target.value = ''
                }}
              />
            </label>
            <p className="text-[10px] text-white/25">Ảnh đầu tiên sẽ là thumbnail chính. Slideshow tự chạy trên card.</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleDelete}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(252,165,165,1)' }}>
            <Trash2 size={13} /> Xóa
          </button>
          <button onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)' }}>
            Hủy
          </button>
          <button onClick={handleSave} disabled={!form.title.trim()}
            className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <Edit2 size={13} /> Lưu thay đổi
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── CARD SLIDESHOW ─────────────────────────────────────── */
const CardSlideshow = memo(function CardSlideshow({ images, ratio, gradient, icon, type, isHovered }) {
  const [current, setCurrent] = useState(0)
  const [dir, setDir] = useState(1)

  const total = images.length

  useEffect(() => {
    if (total <= 1 || isHovered) return
    const timer = setInterval(() => {
      setDir(1)
      setCurrent(c => (c + 1) % total)
    }, 3500)
    return () => clearInterval(timer)
  }, [total, isHovered])

  const goTo = (idx, e) => {
    e.stopPropagation()
    setDir(idx > current ? 1 : -1)
    setCurrent(idx)
  }
  const prev = (e) => {
    e.stopPropagation()
    setDir(-1)
    setCurrent(c => (c - 1 + total) % total)
  }
  const next = (e) => {
    e.stopPropagation()
    setDir(1)
    setCurrent(c => (c + 1) % total)
  }

  const variants = {
    enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  }

  return (
    <div className="relative overflow-hidden w-full"
      style={{ aspectRatio: ratio || '16/9' }}>
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        {total > 0 ? (
          <motion.div
            key={current}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.22, 0.8, 0.22, 1] }}
            className="absolute inset-0"
          >
            <img
              src={images[current]}
              alt={`slide-${current}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center select-none"
            style={{ background: gradient }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 75% 50% at 50% 0%, rgba(255,255,255,0.18), transparent 60%)' }} />
            {type === 'animated' && (
              <div className="absolute inset-0"
                style={{ background: gradient, backgroundSize: '220% 220%', animation: 'gradient 5s ease infinite', opacity: 0.6 }} />
            )}
            <span className="text-5xl sm:text-6xl font-bold text-white/85 drop-shadow-lg z-10"
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              {icon}
            </span>
          </div>
        )}
      </AnimatePresence>

      {total > 0 && (
        <>
          <div className="absolute bottom-0 inset-x-0 h-12 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to top, rgba(7,7,16,0.65), transparent)' }} />
          <div className="absolute inset-x-0 top-0 h-px z-10"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />

          {total > 1 && isHovered && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <ChevronLeft size={13} className="text-white" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <ChevronRight size={13} className="text-white" />
              </button>
            </>
          )}

          {total > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => goTo(i, e)}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: i === current ? 16 : 5,
                    height: 5,
                    background: i === current ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </div>
          )}

          {total > 1 && (
            <div className="absolute top-3 right-3 z-20 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}>
              {current + 1}/{total}
            </div>
          )}
        </>
      )}

      {total === 0 && (
        <>
          <div className="absolute bottom-0 inset-x-0 h-12 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to top, rgba(7,7,16,0.6), transparent)' }} />
          <div className="absolute inset-x-0 top-0 h-px z-10"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
        </>
      )}
    </div>
  )
})

/* ─── PRODUCT CARD ───────────────────────────────────────── */
function ProductCard({ p, onClick }) {
  const { isOwned } = useAppStore()
  const owned = isOwned(p.id)
  const [hovered, setHovered] = useState(false)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 0.8, 0.22, 1] }}
      whileHover={{ y: -5 }}
      onClick={() => onClick(p)}
      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer h-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(110,75,255,0.45)'
        e.currentTarget.style.boxShadow = '0 20px 60px rgba(110,75,255,0.22), 0 0 0 1px rgba(110,75,255,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
      }}
    >
      {/* ── Slideshow Thumbnail ── */}
      <div
        className="relative flex-shrink-0"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CardSlideshow
          images={p.images?.length > 0 ? p.images : p.previewDataUrl ? [p.previewDataUrl] : []}
          ratio={p.ratio || '16/9'}
          gradient={p.gradient}
          icon={p.icon}
          type={p.type}
          isHovered={hovered}
        />
        {/* Tags overlay */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-30">
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
            {p.tag}
          </span>
          {p.badge && (
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold backdrop-blur-md
              ${p.badge === 'HOT' ? 'bg-rose-500/85 text-white' : 'bg-brand-500/85 text-white'}`}>
              {p.badge}
            </span>
          )}
        </div>
        {/* Type pill */}
        <div className="absolute top-3 right-3 z-30">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold backdrop-blur-md
            ${p.type === 'animated'
              ? 'bg-brand-500/75 text-white border border-brand-400/40'
              : 'bg-black/40 text-white/60 border border-white/10'}`}>
            {p.type === 'animated' ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Động</>
            ) : 'Tĩnh'}
          </span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(7,7,16,0) 30%, rgba(7,7,16,0.45) 100%)' }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(16px)' }}>
            <Eye size={13} /> Xem chi tiết
          </div>
        </div>
        {/* Owned overlay */}
        {owned && (
          <div className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: 'rgba(5, 46, 22, 0.72)', backdropFilter: 'blur(4px)' }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-emerald-300 text-xs font-semibold"
              style={{ background: 'rgba(43,242,192,0.18)', border: '1px solid rgba(43,242,192,0.35)' }}>
              <Download size={13} /> Đã sở hữu — bấm để tải
            </div>
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="flex flex-col gap-3 p-4">
        {/* Category + Title */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">
            {p.category.replace(/-/g, ' ')}
          </p>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1 group-hover:text-brand-200 transition-colors">
            {p.title}
          </h3>
          <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{p.desc}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06]" />

        {/* Rating + Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            {p.rating ? (
              <span className="text-xs font-medium text-white/55">{p.rating}</span>
            ) : null}
            <span className="text-[10px] text-white/30">· {p.sold ?? 0} bán</span>
          </div>
          <div className="flex items-center gap-1 font-display font-bold text-sm"
            style={{ color: '#facc15' }}>
            <Coins size={12} className="text-yellow-400" />
            {p.price.toLocaleString('vi-VN')}đ
          </div>
        </div>
        {/* Discount code badge */}
        {p.discountCode && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-1.5 py-0.5 text-[9px] rounded font-bold"
              style={{ background: 'rgba(43,242,192,0.15)', border: '1px solid rgba(43,242,192,0.3)', color: 'rgba(43,242,192,1)' }}>
              {p.discountCode}
              {p.discountPercent > 0 ? ` -${p.discountPercent}%` : ''}
            </span>
          </div>
        )}
        {/* Nút tùy chỉnh nếu đã mua và có editableFields */}
        {owned && p.editableFields?.length > 0 && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] rounded-lg font-semibold"
              style={{ background: 'rgba(77,208,255,0.12)', border: '1px solid rgba(77,208,255,0.3)', color: 'rgba(77,208,255,1)' }}>
              ✏️ Có thể tùy chỉnh
            </span>
          </div>
        )}
      </div>
    </motion.article>
  )
}

/* ─── PRODUCT MODAL ──────────────────────────────────────── */
function ProductModal({ product, onClose, isAdmin, onEditClick, isStoreProduct }) {
  const { user, deductBalance } = useAuthStore()
  const { addOwned, isOwned, downloadProduct, toast } = useAppStore()
  const updateProduct = useShopStore(s => s.updateProduct)
  const navigate = useNavigate()
  const owned = product ? isOwned(product.id) : false
  const [inputCode, setInputCode] = useState('')
  const [modalSlide, setModalSlide] = useState(0)
  const [modalHovered, setModalHovered] = useState(false)

  const appliedDiscount = !!(inputCode && product?.discountCode && inputCode.toUpperCase() === product.discountCode.toUpperCase() && product?.discountPercent > 0)
  const finalPrice = appliedDiscount ? Math.round(product.price * (1 - product.discountPercent / 100)) : (product?.price ?? 0)

  const buy = () => {
    if (!user) {
      toast('Vui lòng đăng nhập để mua hàng', 'warn', 'Chưa đăng nhập')
      navigate('/auth')
      return
    }
    if (user.balance < finalPrice) {
      // Admin bypass — deductBalance already returns true for admin
      const isAdminUser = user.email === 'finnlive246@gmail.com'
      if (!isAdminUser) {
        toast(`Cần thêm ${(finalPrice - user.balance).toLocaleString('vi-VN')}đ`, 'error', 'Không đủ số dư')
        return
      }
    }
    deductBalance(finalPrice)
    addOwned(product.id)
    if (isStoreProduct) {
      updateProduct(product.id, { sold: (product.sold || 0) + 1 })
    }
    toast(`Đã mua "${product.title}" thành công! 🎉`, 'success', 'Mua hàng thành công')
    onClose()
  }

  if (!product) return null

  const images = product.images?.length > 0 ? product.images : product.previewDataUrl ? [product.previewDataUrl] : []

  return (
    <Modal open={!!product} onClose={onClose} size="xl">
      <div className="grid md:grid-cols-[1.2fr_1fr] min-h-0">
        {/* ── Cột trái: Preview ảnh lớn + thumbnail strip ── */}
        <div className="flex flex-col rounded-tl-3xl rounded-tr-3xl md:rounded-tr-none md:rounded-bl-3xl overflow-hidden"
          style={{ background: '#07070f' }}>
          {/* Main slideshow */}
          <div
            className="relative flex-1 min-h-[200px]"
            style={{ aspectRatio: product.ratio || '16/9' }}
            onMouseEnter={() => setModalHovered(true)}
            onMouseLeave={() => setModalHovered(false)}
          >
            {images.length > 0 ? (
              <CardSlideshow
                images={images}
                ratio={product.ratio || '16/9'}
                gradient={product.gradient}
                icon={product.icon}
                type={product.type}
                isHovered={modalHovered}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: product.gradient }}>
                <div className="absolute inset-0"
                  style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,255,255,0.2), transparent 60%)' }} />
                <span className="text-8xl font-bold text-white/75 z-10"
                  style={{ textShadow: '0 6px 28px rgba(0,0,0,0.5)' }}>{product.icon}</span>
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                {product.tag}
              </span>
              {product.type === 'animated' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md bg-brand-500/75 text-white">✦ Động</span>
              )}
            </div>
          </div>
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto"
              style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setModalSlide(i)}
                  className="flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200"
                  style={{
                    width: 56, height: 40,
                    border: i === modalSlide ? '2px solid rgba(110,75,255,0.8)' : '2px solid rgba(255,255,255,0.1)',
                    boxShadow: i === modalSlide ? '0 0 10px rgba(110,75,255,0.4)' : 'none',
                  }}>
                  <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Cột phải: Info ── */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-white/30 mb-1">
              {product.category.replace(/-/g, ' ')}
            </p>
            <h2 className="font-display text-xl font-bold text-white">{product.title}</h2>
            <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{product.desc}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_,i) => (
                <Star key={i} size={12}
                  className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />
              ))}
              <span className="text-xs text-white/40 ml-1.5">{product.rating}</span>
            </div>
            <span className="text-xs text-white/25">·</span>
            <span className="text-xs text-white/40">{product.sold} đã bán</span>
          </div>

          {/* Features */}
          <div className="space-y-2">
            {['File gốc PSD + Figma', 'Font chữ miễn phí đi kèm', 'Hướng dẫn chỉnh sửa', 'Hỗ trợ sau mua hàng'].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-white/50">
                <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>

          {/* Price block */}
          <div className="mt-auto space-y-2.5">
            {/* Discount code input */}
            {product.discountCode && !owned && (
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">Mã giảm giá</label>
                <div className="flex gap-2">
                  <input
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    placeholder="Nhập mã..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: appliedDiscount ? '1px solid rgba(43,242,192,0.5)' : '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.85)' }}
                  />
                  {appliedDiscount && (
                    <span className="px-2 py-1 rounded-xl text-[10px] font-bold flex items-center"
                      style={{ background: 'rgba(43,242,192,0.15)', color: 'rgba(43,242,192,1)' }}>
                      -{product.discountPercent}%
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
              <span className="text-sm text-white/55">
                {appliedDiscount ? 'Giá sau giảm' : 'Giá sản phẩm'}
              </span>
              <div className="flex items-center gap-2">
                {appliedDiscount && (
                  <span className="text-sm text-white/30 line-through">{product.price.toLocaleString('vi-VN')}đ</span>
                )}
                <span className="font-display text-xl font-bold text-yellow-400 flex items-center gap-1.5">
                  <Coins size={15} /> {finalPrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {user && (
              <div className="flex items-center justify-between px-3 py-1.5 text-xs rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-white/35">Số dư của bạn</span>
                <span className={`font-semibold ${user.balance >= finalPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {user.balance.toLocaleString('vi-VN')}đ
                </span>
              </div>
            )}

            {/* Admin edit/delete buttons for store products */}
            {isAdmin && isStoreProduct && (
              <button onClick={() => onEditClick && onEditClick(product)}
                className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                style={{ background: 'rgba(110,75,255,0.12)', border: '1px solid rgba(110,75,255,0.25)', color: 'rgba(167,139,250,1)' }}>
                <Edit2 size={13} /> Chỉnh sửa sản phẩm
              </button>
            )}

            {owned && product.psdTemplateId && (!product.editableFields || product.editableFields.length === 0) && (
              <button
                onClick={() => { onClose(); navigate(`/psd/${product.id}`) }}
                className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
              >
                ✦ Mở PSD editor
              </button>
            )}
            {owned && product.psdTemplateId && product.editableFields?.length > 0 && (
              <button
                onClick={() => {
                  onClose()
                  navigate(`/psd/${product.id}`)
                }}
                className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
              >
                ✏️ Tùy chỉnh & Tải về
              </button>
            )}
            {owned ? (
              <button
                onClick={() => downloadProduct(product)}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(43,242,192,0.18), rgba(77,208,255,0.14))',
                  border: '1px solid rgba(43,242,192,0.35)',
                  color: 'rgba(110,231,183,1)',
                  boxShadow: '0 4px 16px -4px rgba(43,242,192,0.4)',
                }}>
                <Download size={15} /> Tải xuống ngay
              </button>
            ) : (
              <button onClick={buy} className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
                {user
                  ? <><Zap size={14} /> Mua ngay — {finalPrice.toLocaleString('vi-VN')}đ</>
                  : <><Lock size={14} /> Đăng nhập để mua</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─── SHOP PAGE ──────────────────────────────────────────── */
export default function ShopPage() {
  const [cat,    setCat]    = useState('all')
  const [type,   setType]   = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  const { products: storeProducts, updateProduct, deleteProduct } = useShopStore()
  const isAdmin = useAuthStore(s => s.isAdmin())
  const { toast } = useAppStore()

  const allProducts = [...PRODUCTS, ...storeProducts]

  const filtered = allProducts.filter(p => {
    if (cat  !== 'all' && p.category !== cat)                              return false
    if (type !== 'all' && p.type     !== type)                             return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()))   return false
    return true
  })

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold mb-2 text-brand-300"
            style={{ background: 'rgba(110,75,255,0.14)', border: '1px solid rgba(110,75,255,0.28)' }}>
            <ShoppingBag size={11} /> Cửa hàng
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Tài nguyên <span className="grad">thiết kế</span>
          </h1>
          <p className="text-sm text-white/35 mt-1">{filtered.length} sản phẩm</p>
        </div>


      </div>

      {/* ── Guide ── */}
      <GuideSection
        title="Hướng dẫn mua hàng"
        subtitle="Mua thumbnail, logo, banner cao cấp — chỉnh sửa trực tiếp sau khi sở hữu"
        accent="brand"
        icon={ShoppingBag}
        compact
        badgeText="4 bước"
        steps={[
          { icon: Filter,        title: 'Lọc sản phẩm',  desc: 'Chọn danh mục (Thumbnail, Logo, Banner...) và loại (Tĩnh / Động).', tip: 'Sản phẩm Động (animated) có hiệu ứng video, Lottie, GIF.' },
          { icon: MousePointer2, title: 'Xem chi tiết',  desc: 'Click vào card để mở preview lớn, slideshow ảnh và mô tả đầy đủ.' },
          { icon: Coins,         title: 'Thanh toán',    desc: 'Đủ coin trong ví thì click "Mua ngay". Có thể nhập mã giảm giá.', tip: 'Nạp coin nhanh ở trang Topup nếu chưa đủ.' },
          { icon: Wand2,         title: 'Chỉnh sửa',     desc: 'Sản phẩm có nhãn "Có thể tùy chỉnh" sẽ mở Customer Editor.', tip: 'Đổi text, màu, ảnh, xuất file PNG/JPG ngay trên web.' },
        ]}
        tips={[
          'Mọi sản phẩm sau khi mua đều thuộc sở hữu vĩnh viễn — không cần mua lại.',
          'Mã giảm giá thường được tặng kèm khi quay số trong trang Hộp quà.',
        ]}
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCat(c.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
              style={cat === c.value
                ? { background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)', color: '#fff', boxShadow: '0 4px 14px rgba(110,75,255,0.4)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10 hidden sm:block" />

        {/* Type */}
        <div className="flex gap-1.5">
          {TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
              style={type === t.value
                ? { background: 'rgba(77,208,255,0.18)', border: '1px solid rgba(77,208,255,0.4)', color: '#4dd0ff' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
            {filtered.map(p => (
              <div key={p.id} className="flex flex-col">
                <ProductCard p={p} onClick={setSelected} />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-white/30">
            <ShoppingBag size={44} className="mb-3 opacity-25" />
            <p className="text-sm">Không tìm thấy sản phẩm phù hợp</p>
            <button onClick={() => { setSearch(''); setCat('all'); setType('all') }}
              className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Xoá bộ lọc
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductModal
        product={selected}
        onClose={() => setSelected(null)}
        isAdmin={isAdmin}
        isStoreProduct={selected ? !PRODUCTS.find(p => p.id === selected.id) : false}
        onEditClick={(p) => { setEditTarget(p); setSelected(null) }}
      />

      <EditProductModal
        open={!!editTarget}
        product={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={(changes) => {
          updateProduct(editTarget.id, changes)
          setEditTarget(null)
          toast('Đã cập nhật sản phẩm', 'success', 'Cập nhật')
        }}
        onDelete={(id) => {
          deleteProduct(id)
          setEditTarget(null)
          setSelected(null)
          toast('Đã xóa sản phẩm', 'success', 'Xóa')
        }}
      />
    </div>
  )
}
