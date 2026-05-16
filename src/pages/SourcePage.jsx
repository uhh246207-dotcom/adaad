import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Download, Heart, Star, ExternalLink, Search,
  Cpu, FileCode, Package, GitBranch, Sparkles, Coins,
  CheckCircle, Lock,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from 'react-router-dom'
import GuideSection from '../components/ui/GuideSection'
import clsx from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Catalog
// Each item is structured like a Shop product so the same buy/download
// helpers from `useAppStore` work transparently.
// ─────────────────────────────────────────────────────────────────────────────
const CODE_PRODUCTS = [
  {
    id: 'src-react-dashboard',
    title: 'React Admin Dashboard',
    desc: 'Full-stack admin template — React 18, Tailwind, charts, dark mode, auth ready.',
    category: 'web',
    stack: ['React 18', 'Tailwind', 'Vite'],
    price: 290000, originalPrice: 490000,
    rating: 4.9, sold: 312, badge: 'HOT',
    fileType: 'zip', fileSize: '4.2 MB',
    fileUrl: 'data:text/plain;base64,Tk9WQS1BSU8tU3R1ZGlvIC0gUmVhY3QgQWRtaW4gRGFzaGJvYXJkIGNvZGUgYnVuZGxlLg==',
    gradient: 'linear-gradient(135deg,#61dafb,#7c3aed)',
    free: false,
  },
  {
    id: 'src-nextjs-shop',
    title: 'Next.js E-commerce Starter',
    desc: 'Cửa hàng online hoàn chỉnh, SEO-ready, Stripe/Momo, giỏ hàng & wishlist.',
    category: 'web',
    stack: ['Next 14', 'Stripe', 'Prisma'],
    price: 450000,
    rating: 4.8, sold: 187,
    fileType: 'zip', fileSize: '6.8 MB',
    fileUrl: 'data:text/plain;base64,TmV4dC5qcyBlLWNvbW1lcmNlIHN0YXJ0ZXIgYnVuZGxl',
    gradient: 'linear-gradient(135deg,#000,#646cff)',
    free: false,
  },
  {
    id: 'src-vue-portfolio',
    title: 'Vue 3 Portfolio Template',
    desc: 'Portfolio cá nhân nhiều theme, animation Lottie, contact form.',
    category: 'web',
    stack: ['Vue 3', 'Pinia', 'Vite'],
    price: 0,
    rating: 4.6, sold: 1024, badge: 'FREE',
    fileType: 'zip', fileSize: '2.1 MB',
    fileUrl: 'data:text/plain;base64,VnVlIDMgcG9ydGZvbGlvIHN0YXJ0ZXIgY29kZQ==',
    gradient: 'linear-gradient(135deg,#42b883,#34495e)',
    free: true,
  },
  {
    id: 'src-rn-chat',
    title: 'React Native Chat App',
    desc: 'App chat realtime với Firebase, push notification, gửi ảnh & emoji.',
    category: 'mobile',
    stack: ['React Native', 'Firebase'],
    price: 380000,
    rating: 4.7, sold: 92, badge: 'NEW',
    fileType: 'zip', fileSize: '8.3 MB',
    fileUrl: 'data:text/plain;base64,UmVhY3QgTmF0aXZlIGNoYXQgYnVuZGxl',
    gradient: 'linear-gradient(135deg,#FF6B6B,#7c3aed)',
    free: false,
  },
  {
    id: 'src-flutter-banking',
    title: 'Flutter Banking UI Kit',
    desc: 'Bộ UI Kit ngân hàng/fintech 30+ màn hình, animation mượt, tài liệu kèm.',
    category: 'mobile',
    stack: ['Flutter', 'Riverpod'],
    price: 320000,
    rating: 4.9, sold: 145,
    fileType: 'zip', fileSize: '12.7 MB',
    fileUrl: 'data:text/plain;base64,Rmx1dHRlciBiYW5raW5nIFVJIGtpdA==',
    gradient: 'linear-gradient(135deg,#02569B,#13B9FD)',
    free: false,
  },
  {
    id: 'src-discord-bot',
    title: 'Discord Bot Boilerplate',
    desc: 'Bot Discord đa tính năng — moderation, music, leveling, slash commands.',
    category: 'tool',
    stack: ['Node.js', 'discord.js'],
    price: 150000,
    rating: 4.5, sold: 678, badge: 'POPULAR',
    fileType: 'zip', fileSize: '1.8 MB',
    fileUrl: 'data:text/plain;base64,RGlzY29yZCBib3QgYm9pbGVycGxhdGU=',
    gradient: 'linear-gradient(135deg,#5865f2,#1a1a2e)',
    free: false,
  },
  {
    id: 'src-ai-chatgpt-clone',
    title: 'ChatGPT Clone với GPT-4',
    desc: 'Clone giao diện ChatGPT với streaming, lịch sử chat, đa ngôn ngữ.',
    category: 'ai',
    stack: ['Next.js', 'OpenAI', 'Vercel AI SDK'],
    price: 550000,
    rating: 5.0, sold: 234, badge: 'AI',
    fileType: 'zip', fileSize: '5.4 MB',
    fileUrl: 'data:text/plain;base64,Q2hhdEdQVCBjbG9uZSBidW5kbGU=',
    gradient: 'linear-gradient(135deg,#10a37f,#0d8b6c)',
    free: false,
  },
  {
    id: 'src-image-upscaler',
    title: 'AI Image Upscaler',
    desc: 'Web app phóng to ảnh 4× bằng AI, chạy hoàn toàn trên trình duyệt.',
    category: 'ai',
    stack: ['ONNX', 'WebGL'],
    price: 0,
    rating: 4.8, sold: 412, badge: 'FREE',
    fileType: 'zip', fileSize: '3.5 MB',
    fileUrl: 'data:text/plain;base64,QUkgaW1hZ2UgdXBzY2FsZXIgYnVuZGxl',
    gradient: 'linear-gradient(135deg,#06b6d4,#22d3ee)',
    free: true,
  },
  {
    id: 'src-vscode-theme',
    title: 'VSCode Theme Pack — Cyber',
    desc: '5 theme cyberpunk neon cho VSCode, hỗ trợ JS, TS, Python, Go.',
    category: 'tool',
    stack: ['VSCode', 'JSON'],
    price: 50000,
    rating: 4.7, sold: 1893, badge: 'CHEAP',
    fileType: 'zip', fileSize: '0.3 MB',
    fileUrl: 'data:text/plain;base64,VlNDb2RlIHRoZW1lIGN5YmVy',
    gradient: 'linear-gradient(135deg,#ff2e63,#7c5cff,#08d9d6)',
    free: false,
  },
]

const CATEGORIES = [
  { value: 'all',    label: 'Tất cả',  icon: Code2 },
  { value: 'web',    label: 'Web',     icon: FileCode },
  { value: 'mobile', label: 'Mobile',  icon: Cpu },
  { value: 'ai',     label: 'AI / ML', icon: Sparkles },
  { value: 'tool',   label: 'Tool',    icon: Package },
]

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
function CodeCard({ p, owned, onClick, onDownload }) {
  const [liked, setLiked] = useState(false)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(p)}
      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer h-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'box-shadow .3s, border-color .3s, transform .3s',
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
      {/* Header preview band */}
      <div
        className="relative h-32 flex items-center justify-center overflow-hidden"
        style={{ background: p.gradient }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 75% 50% at 50% 0%, rgba(255,255,255,0.18), transparent 60%)' }} />
        {/* faux code lines */}
        <div className="relative z-10 flex flex-col gap-1.5 opacity-80 px-6">
          {[68, 92, 54, 78, 40].map((w, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full"
              style={{
                width: `${w}px`,
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 0 8px rgba(255,255,255,0.4)',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
        <Code2 size={26} className="absolute right-4 bottom-3 text-white/40" />

        {/* Tags */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-20">
          {p.badge && (
            <span className={clsx('px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md',
              p.badge === 'HOT'     ? 'bg-rose-500/85 text-white'
              : p.badge === 'NEW'   ? 'bg-brand-500/85 text-white'
              : p.badge === 'FREE'  ? 'bg-emerald-500/85 text-white'
              : p.badge === 'AI'    ? 'bg-cyan-500/85 text-white'
              : p.badge === 'CHEAP' ? 'bg-amber-500/85 text-white'
              : 'bg-fuchsia-500/85 text-white')}>
              {p.badge}
            </span>
          )}
        </div>

        {/* Owned overlay */}
        {owned && (
          <div className="absolute inset-0 z-30 flex items-center justify-center backdrop-blur-[2px]"
            style={{ background: 'rgba(5, 46, 22, 0.55)' }}>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-semibold"
              style={{ background: 'rgba(43,242,192,0.18)', border: '1px solid rgba(43,242,192,0.35)' }}>
              <CheckCircle size={13} /> Đã sở hữu
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">
            {p.category}
          </p>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1 group-hover:text-brand-200 transition-colors">
            {p.title}
          </h3>
          <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">{p.desc}</p>
        </div>

        {/* Stack pills */}
        <div className="flex flex-wrap gap-1">
          {p.stack.slice(0, 3).map(s => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}>
              {s}
            </span>
          ))}
        </div>

        <div className="h-px bg-white/[0.06]" />

        {/* Stats + price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-white/35">
            <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400" /> {p.rating}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Download size={9} /> {p.sold}</span>
            <span>·</span>
            <span>{p.fileSize}</span>
          </div>
          {p.free
            ? <span className="text-xs font-bold text-emerald-400">MIỄN PHÍ</span>
            : <span className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                <Coins size={12} /> {p.price.toLocaleString('vi-VN')}đ
              </span>}
        </div>

        {/* Action footer */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setLiked(v => !v) }}
            className={clsx('p-2 rounded-xl transition-all',
              liked ? 'text-rose-400 bg-rose-400/10' : 'text-white/30 hover:text-rose-400 hover:bg-rose-400/10')}>
            <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
          </button>
          {(owned || p.free) ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(p) }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: 'rgba(43,242,192,0.18)',
                border: '1px solid rgba(43,242,192,0.35)',
                color: 'rgba(110,231,183,1)',
              }}>
              <Download size={12} /> Tải về
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(p) }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold btn-primary">
              <Coins size={12} /> Mua ngay
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail modal
// ─────────────────────────────────────────────────────────────────────────────
function ProductDetailModal({ product, onClose }) {
  const { user, deductBalance } = useAuthStore()
  const { addOwned, isOwned, downloadProduct, getDownloadCount, toast } = useAppStore()
  const navigate = useNavigate()

  if (!product) return null
  const owned = isOwned(product.id) || product.free
  const downloads = getDownloadCount(product.id)

  const buy = () => {
    if (!user) {
      toast('Vui lòng đăng nhập', 'warn', 'Chưa đăng nhập')
      navigate('/auth')
      return
    }
    if (product.free) {
      addOwned(product.id)
      downloadProduct(product)
      onClose()
      return
    }
    const ok = deductBalance(product.price)
    if (!ok) {
      toast(`Cần thêm ${(product.price - user.balance).toLocaleString('vi-VN')}đ`, 'error', 'Không đủ số dư')
      return
    }
    addOwned(product.id)
    toast(`Đã mua "${product.title}"!`, 'success', 'Mua thành công')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
          onClick={e => e.stopPropagation()}
          className="rounded-3xl overflow-hidden w-full max-w-lg"
          style={{
            background: 'rgba(14,14,24,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Hero */}
          <div className="h-40 relative" style={{ background: product.gradient }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Code2 size={48} className="text-white/85 drop-shadow-lg" />
            </div>
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
              ✕
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30">{product.category}</p>
              <h2 className="font-display text-lg font-bold text-white">{product.title}</h2>
              <p className="text-xs text-white/55 mt-1.5 leading-relaxed">{product.desc}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {product.stack.map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(110,75,255,0.12)', border: '1px solid rgba(110,75,255,0.25)', color: 'rgba(167,139,250,1)' }}>
                  {s}
                </span>
              ))}
            </div>

            {/* What's included */}
            <div className="space-y-1.5 rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                `Mã nguồn đầy đủ (${product.fileSize})`,
                'Tài liệu hướng dẫn cài đặt',
                'Cập nhật miễn phí 6 tháng',
                'Hỗ trợ qua Discord',
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-white/55">
                  <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" /> {f}
                </div>
              ))}
            </div>

            {downloads > 0 && (
              <div className="text-[11px] text-emerald-300/80 flex items-center gap-1.5">
                <Download size={11} /> Bạn đã tải file này {downloads} lần
              </div>
            )}

            {/* Price + actions */}
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
              <span className="text-xs text-white/55">Giá</span>
              {product.free
                ? <span className="font-display text-lg font-bold text-emerald-400">MIỄN PHÍ</span>
                : (
                  <div className="flex items-center gap-2">
                    {product.originalPrice && (
                      <span className="text-xs text-white/30 line-through">
                        {product.originalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                    <span className="font-display text-lg font-bold text-yellow-400 flex items-center gap-1">
                      <Coins size={14} /> {product.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )}
            </div>

            {owned ? (
              <button
                onClick={() => { downloadProduct(product) }}
                className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
                <Download size={14} /> Tải về ngay
              </button>
            ) : (
              <button onClick={buy} className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
                {user
                  ? <>{product.free ? <Download size={14} /> : <Coins size={14} />} {product.free ? 'Tải miễn phí' : `Mua — ${product.price.toLocaleString('vi-VN')}đ`}</>
                  : <><Lock size={14} /> Đăng nhập để mua</>}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function SourcePage() {
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('popular')
  const [selected, setSelected] = useState(null)
  const { isOwned, downloadProduct } = useAppStore()

  const filtered = useMemo(() => {
    let list = CODE_PRODUCTS.filter(p => {
      if (cat !== 'all' && p.category !== cat) return false
      if (search && !`${p.title} ${p.desc} ${p.stack.join(' ')}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    if (sort === 'popular') list = [...list].sort((a, b) => b.sold - a.sold)
    if (sort === 'rating')  list = [...list].sort((a, b) => b.rating - a.rating)
    if (sort === 'price-low')  list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-high') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [cat, search, sort])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center gap-2 badge mb-3">
          <Code2 size={13} /> Source Marketplace
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Mua <span className="grad">Mã nguồn</span> chất lượng cao
        </h1>
        <p className="text-white/40 text-sm">Web, Mobile, AI, Tool — code sạch, tài liệu rõ, hỗ trợ tận tình</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { value: `${CODE_PRODUCTS.length}+`, label: 'Sản phẩm' },
          { value: '5,200+', label: 'Lượt mua' },
          { value: '4.8',    label: 'Đánh giá TB' },
          { value: '24/7',   label: 'Hỗ trợ' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="font-display text-xl font-bold grad">{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Guide */}
      <GuideSection
        title="Hướng dẫn mua mã nguồn"
        subtitle="Code sạch, có tài liệu, cập nhật miễn phí — sẵn sàng deploy"
        accent="amber"
        icon={Code2}
        compact
        badgeText="3 bước"
        steps={[
          { icon: Search, title: 'Tìm sản phẩm', desc: 'Lọc theo Web / Mobile / AI / Tool, hoặc dùng thanh tìm kiếm.', tip: 'Có cả sản phẩm MIỄN PHÍ để bạn dùng thử.' },
          { icon: Coins,  title: 'Mua bằng coin', desc: 'Click sản phẩm → Mua ngay. Hệ thống trừ coin tự động.',          tip: 'Nạp coin nhanh ở trang Topup nếu thiếu.' },
          { icon: Download, title: 'Tải về & dùng', desc: 'Sau khi mua, file ZIP có sẵn ở trang "Đã tải" để tải lại.',  tip: 'Mọi sản phẩm cập nhật miễn phí trong 6 tháng.' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mô tả, stack..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(110,75,255,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm text-white/70 outline-none cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="popular">Phổ biến nhất</option>
          <option value="rating">Đánh giá cao</option>
          <option value="price-low">Giá thấp → cao</option>
          <option value="price-high">Giá cao → thấp</option>
        </select>
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setCat(value)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all',
              cat === value
                ? 'bg-brand-500 text-white shadow-glow-sm'
                : 'glass text-white/50 hover:text-white hover:bg-white/[0.06]')}>
            <Icon size={13} /> {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-white/30 self-center">{filtered.length} sản phẩm</span>
      </div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
            {filtered.map(p => (
              <CodeCard
                key={p.id}
                p={p}
                owned={isOwned(p.id)}
                onClick={setSelected}
                onDownload={downloadProduct}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 text-white/30">
            <Code2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Không tìm thấy sản phẩm phù hợp</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open-source repo */}
      <motion.a
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        href="https://github.com/cayaccdivi-design/adadaf"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 glass-card p-5 group"
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(110,75,255,0.15)', border: '1px solid rgba(110,75,255,0.3)' }}>
          <GitBranch size={20} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white group-hover:text-brand-200 transition-colors">
            Source code dự án NOVA AI Studio
          </p>
          <p className="text-xs text-white/40">Mã nguồn miễn phí trên GitHub — React + Vite + Tailwind + Konva</p>
        </div>
        <ExternalLink size={16} className="text-white/30 group-hover:text-brand-400 transition-colors flex-shrink-0" />
      </motion.a>

      {/* Modal */}
      <ProductDetailModal product={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
