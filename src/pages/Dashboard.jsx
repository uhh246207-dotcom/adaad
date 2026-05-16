import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShoppingBag, Gift, Scissors, FolderOpen,
  Coins, ArrowRight, Zap, Star, Sparkles,
  Download, TrendingUp,
  Clock, Activity, CheckCircle2, MessageSquare,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'

/* ─── Stat Card ─────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, change, trend, link, accent }) {
  const Wrapper = link ? Link : 'div'
  const colors = {
    purple: { bg: 'rgba(110,75,255,0.12)', border: 'rgba(110,75,255,0.25)', icon: 'text-brand-300', glow: 'rgba(110,75,255,0.35)', dot: '#7c5cff' },
    yellow: { bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)',  icon: 'text-yellow-300', glow: 'rgba(250,204,21,0.3)',  dot: '#facc15' },
    cyan:   { bg: 'rgba(77,208,255,0.1)',  border: 'rgba(77,208,255,0.22)', icon: 'text-cyan-300',   glow: 'rgba(77,208,255,0.35)', dot: '#4dd0ff' },
    green:  { bg: 'rgba(43,242,192,0.1)',  border: 'rgba(43,242,192,0.22)', icon: 'text-teal-300',   glow: 'rgba(43,242,192,0.35)', dot: '#2bf2c0' },
  }
  const c = colors[accent] || colors.purple

  return (
    <Wrapper to={link}
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 group hover:scale-[1.02]"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}>
      {/* top-rim highlight */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c.dot}55, transparent)` }} />
      {/* bottom shimmer line */}
      <div className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c.dot}33, transparent)` }} />
      {/* hover glow */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)` }} />

      {/* Icon row */}
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${c.dot}22`, border: `1px solid ${c.dot}40` }}>
          <Icon size={18} className={c.icon} />
        </div>
        {trend === 'up' && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(43,242,192,0.12)', border: '1px solid rgba(43,242,192,0.2)' }}>
            <TrendingUp size={9} /> UP
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="font-display text-3xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs text-white/45 mt-0.5">{label}</p>
      </div>

      {/* Change */}
      {change && (
        <p className={`text-[11px] font-medium flex items-center gap-1 mt-auto ${c.icon}`}>
          {change}
          {link && <ArrowRight size={10} />}
        </p>
      )}
    </Wrapper>
  )
}

/* ─── Quick Action Card ──────────────────────────────────── */
function QuickCard({ to, icon: Icon, label, desc, gradient, badge }) {
  return (
    <Link to={to}
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 group transition-all duration-300 hover:-translate-y-1 h-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      }}>
      {/* gradient accent top - always visible slightly */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-30 group-hover:opacity-100 transition-opacity"
        style={{ background: gradient }} />
      {/* bg glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.035), transparent 60%)` }} />

      {/* Icon */}
      <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: gradient, boxShadow: `0 4px 16px rgba(0,0,0,0.3), 0 0 20px rgba(110,75,255,0.25)` }}>
        <Icon size={22} className="text-white drop-shadow-sm" />
        {badge && (
          <span className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shadow-sm
            ${badge === 'AI' ? 'bg-cyan-500' : 'bg-rose-500'}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="relative">
        <p className="font-semibold text-white text-sm leading-tight">{label}</p>
        <p className="text-xs text-white/40 mt-1 leading-relaxed">{desc}</p>
      </div>

      {/* Arrow */}
      <div className="relative mt-auto flex items-center gap-1.5 text-white/25 group-hover:text-white/60 transition-colors text-xs">
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </div>
    </Link>
  )
}

/* ─── Feature Card ───────────────────────────────────────── */
function FeatureCard({ icon, title, desc, delay, link, accent }) {
  const Wrapper = link ? Link : 'div'
  const accentRgb = accent || '#6e4bff'
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.22, 0.8, 0.22, 1] }}
      className="h-full">
      <Wrapper to={link}
        className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 group transition-all duration-300 hover:-translate-y-1 block h-full"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(16px)',
        }}>
        {/* top accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, transparent, ${accentRgb}, transparent)` }} />
        {/* hover shimmer */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${accentRgb}12, transparent 60%)` }} />
        <div className="relative flex flex-col gap-3 flex-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-2xl select-none"
            style={{
              background: `${accentRgb}18`,
              border: `1px solid ${accentRgb}35`,
              backdropFilter: 'blur(8px)',
            }}>{icon}</div>
          <div>
            <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
            <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
          </div>
        </div>
      </Wrapper>
    </motion.div>
  )
}

/* ─── QUICK_ACTIONS ──────────────────────────────────────── */
const QUICK_ACTIONS = [
  { to: '/shop',       icon: ShoppingBag, label: 'Cửa hàng',   desc: '120+ tài nguyên thiết kế cao cấp',   gradient: 'linear-gradient(135deg,#6e4bff,#4dd0ff)', badge: null       },
  { to: '/gift',       icon: Gift,        label: 'Hộp quà',    desc: 'Voucher & mã giảm giá hàng ngày',    gradient: 'linear-gradient(135deg,#10b981,#2bf2c0)', badge: 'HOT'      },
  { to: '/remove-bg',  icon: Scissors,    label: 'Xóa nền AI', desc: 'Tách nền ảnh tự động chỉ 1 giây',    gradient: 'linear-gradient(135deg,#0ea5e9,#4dd0ff)', badge: 'AI'       },
  { to: '/resources',  icon: FolderOpen,  label: 'Tài nguyên', desc: '10,000+ PSD, icon, mockup miễn phí', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', badge: null       },
]

const FEATURES = [
  { icon: '🛍️', title: 'Cửa hàng thiết kế',  desc: 'Mua thumbnail, logo, banner PSD chất lượng cao.',  link: '/shop',       accent: '#6e4bff' },
  { icon: '✂️',  title: 'Xóa nền tự động',    desc: 'Tách nền ảnh chỉ trong 1 giây — không cần Photoshop.', link: '/remove-bg',  accent: '#0ea5e9' },
  { icon: '📦',  title: 'Kho tài nguyên',      desc: '10,000+ file PSD, icon, mockup miễn phí.',         link: '/resources',  accent: '#8b5cf6' },
  { icon: '💻',  title: 'Source Code',         desc: 'Mua bộ code template, layout, ứng dụng nhỏ.',       link: '/source',     accent: '#f59e0b' },
]

const REVIEWS = [
  { id: 1, name: 'Nguyễn Minh Khoa', avatar: 'K', color: '#6e4bff', rating: 5, text: 'Cửa hàng có nhiều mẫu thumbnail YouTube đẹp, chất lượng cao và dễ sử dụng!', time: '2 ngày trước', product: 'Cửa hàng' },
  { id: 2, name: 'Trần Thu Hà',      avatar: 'H', color: '#0ea5e9', rating: 5, text: 'Giao diện tối modern rất thích, mua hàng nhanh và download tiện lợi.', time: '5 ngày trước', product: 'Cửa hàng' },
  { id: 3, name: 'Lê Văn Dũng',     avatar: 'D', color: '#10b981', rating: 4, text: 'Kho tài nguyên phong phú, tải về dễ dàng. Sẽ ủng hộ lâu dài!', time: '1 tuần trước', product: 'Tài nguyên' },
  { id: 4, name: 'Phạm Bảo Châu',   avatar: 'C', color: '#f59e0b', rating: 5, text: 'Xóa nền AI siêu nhanh chỉ 1 giây, chất lượng cao hơn nhiều tool miễn phí khác.', time: '2 tuần trước', product: 'Xóa nền AI' },
]

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuthStore()
  const isAdmin = useAuthStore(s => s.isAdmin())
  const { owned } = useAppStore()

  // Reviews state — load từ localStorage
  const [userReviews, setUserReviews] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nova_reviews_v1')) || [] } catch { return [] }
  })
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '', product: 'Chung' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const submitReview = () => {
    if (!user) return
    if (!reviewForm.text.trim()) return
    setReviewSubmitting(true)
    const newReview = {
      id: Date.now().toString(),
      name: user.name,
      avatar: user.name.charAt(0).toUpperCase(),
      color: ['#6e4bff','#0ea5e9','#10b981','#f59e0b','#ec4899'][Math.floor(Math.random()*5)],
      rating: reviewForm.rating,
      text: reviewForm.text.trim(),
      time: 'Vừa xong',
      product: reviewForm.product,
      userId: user.id,
    }
    const updated = [newReview, ...userReviews].slice(0, 20)
    try { localStorage.setItem('nova_reviews_v1', JSON.stringify(updated)) } catch {}
    setUserReviews(updated)
    setReviewForm({ rating: 5, text: '', product: 'Chung' })
    setShowReviewForm(false)
    setReviewSubmitting(false)
  }

  const allReviews = [...userReviews, ...REVIEWS].slice(0, 8)

  // Build activity feed từ dữ liệu thực
  const activities = []
  if (user) {
    activities.push({ icon: '👋', text: `${user.name} đã đăng nhập`, time: 'Vừa xong', color: '#6e4bff' })
  }
  if (owned.length > 0) {
    activities.push({ icon: '🛒', text: `Đã sở hữu ${owned.length} sản phẩm`, time: 'Tài khoản của bạn', color: '#7c5cff' })
  }
  if (user && user.balance > 0) {
    activities.push({ icon: '💰', text: `Số dư: ${user.balance.toLocaleString('vi-VN')}đ`, time: 'Cập nhật mới nhất', color: '#facc15' })
  }
  activities.push({ icon: '🎁', text: 'Có 4 voucher đang chờ bạn', time: 'Hôm nay', color: '#2bf2c0' })
  activities.push({ icon: '📦', text: '10,000+ tài nguyên miễn phí', time: 'Luôn có sẵn', color: '#4dd0ff' })

  const stats = [
    { icon: ShoppingBag, label: 'Sản phẩm đã mua', value: owned.length.toString() || '0', change: 'Xem cửa hàng', trend: 'up',     link: '/shop',      accent: 'purple' },
    { icon: Coins,        label: 'Số dư ví',         value: user ? `${user.balance.toLocaleString('vi-VN')}đ` : '0đ', change: 'Nạp thêm',   trend: 'neutral', link: '/topup',     accent: 'yellow' },
    { icon: Download,     label: 'Tài nguyên',        value: '10K+',  change: 'Miễn phí tải',  trend: 'up',     link: '/resources', accent: 'cyan'   },
    { icon: Gift,         label: 'Voucher có sẵn',    value: '4',     change: 'Nhận ngay',     trend: 'up',     link: '/gift',      accent: 'green'  },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── Welcome Banner ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ ease: [0.22, 0.8, 0.22, 1] }}
        className="relative overflow-hidden rounded-3xl p-7 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(110,75,255,0.22) 0%, rgba(77,208,255,0.12) 55%, rgba(43,242,192,0.08) 100%)',
          border: '1px solid rgba(110,75,255,0.35)',
          backdropFilter: 'blur(32px) saturate(200%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
        {/* Orbs */}
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(110,75,255,0.32) 0%, transparent 70%)' }} />
        <div className="absolute right-24 bottom-0 w-48 h-48 rounded-full pointer-events-none animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(77,208,255,0.22) 0%, transparent 70%)', animationDelay: '1s' }} />
        <div className="absolute left-1/2 -bottom-12 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(43,242,192,0.18) 0%, transparent 70%)' }} />
        {/* Grid dots */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-medium text-brand-300"
              style={{ background: 'rgba(110,75,255,0.18)', border: '1px solid rgba(110,75,255,0.3)' }}>
              <Sparkles size={12} className="text-brand-300" />
              NOVA AI Studio
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
              Chào {user
                ? <span className="grad">{user.name}</span>
                : <span className="grad">bạn</span>}! 👋
            </h1>
            <p className="text-white/50 text-sm max-w-md leading-relaxed">
              {user
                ? 'Tiếp tục sáng tạo những thiết kế đẳng cấp với sức mạnh AI.'
                : 'Đăng ký miễn phí để truy cập kho tài nguyên và công cụ AI thiết kế.'}
            </p>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            {!user ? (
              <>
                <Link to="/auth?tab=register" className="btn-primary flex items-center gap-1.5 text-sm px-5 py-2.5 whitespace-nowrap">
                  <Sparkles size={14} /> Bắt đầu miễn phí
                </Link>
                <Link to="/auth" className="btn-ghost text-sm px-5 py-2.5 whitespace-nowrap">Đăng nhập</Link>
              </>
            ) : (
              <Link to="/shop" className="btn-primary flex items-center gap-1.5 text-sm px-5 py-2.5 whitespace-nowrap">
                <ShoppingBag size={14} /> Vào cửa hàng
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: [0.22, 0.8, 0.22, 1] }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions + Activity Feed ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Quick Actions - 3/4 width */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <Zap size={14} className="text-brand-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-white">Truy cập nhanh</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 items-stretch">
            {QUICK_ACTIONS.map(({ to, icon, label, desc, gradient, badge, adminOnly }, i) => (
              (!adminOnly || isAdmin) && (
                <motion.div key={to}
                  className="h-full"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07 + 0.15, ease: [0.34, 1.56, 0.64, 1] }}>
                  <QuickCard to={to} icon={icon} label={label} desc={desc} gradient={gradient} badge={badge} />
                </motion.div>
              )
            ))}
          </div>
        </div>

        {/* Activity Feed - 1/4 width */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, ease: [0.22, 0.8, 0.22, 1] }}
          className="lg:w-72 flex-shrink-0 rounded-2xl p-4 flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Activity size={14} className="text-cyan-400" />
              </div>
              <h2 className="font-display text-sm font-semibold text-white">Hoạt động</h2>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <img src={user.avatar} alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover border border-white/10" />
                <span className="text-[11px] text-white/50 truncate max-w-[80px]">{user.name}</span>
              </div>
            )}
          </div>
          {/* User info card nếu đã login */}
          {user && (
            <div className="mb-3 p-2.5 rounded-xl flex items-center gap-2.5"
              style={{ background: 'rgba(110,75,255,0.1)', border: '1px solid rgba(110,75,255,0.2)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(110,75,255,0.2)' }}>
                <Sparkles size={14} className="text-brand-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-white/40 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <div className="space-y-2.5">
            {activities.map((a, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 + 0.35, ease: [0.22, 0.8, 0.22, 1] }}
                className="flex items-center gap-2.5 p-2 rounded-xl transition-colors hover:bg-white/[0.03]">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: `${a.color}18`, border: `1px solid ${a.color}30` }}>
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/80 leading-snug truncate">{a.text}</p>
                  <p className="text-[10px] text-white/35 mt-0.5 flex items-center gap-1">
                    <Clock size={9} />{a.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          {!user && (
            <Link to="/auth" className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(110,75,255,0.12)', border: '1px solid rgba(110,75,255,0.25)', color: 'rgba(167,139,250,1)' }}>
              <Sparkles size={12} /> Đăng nhập để xem hoạt động
            </Link>
          )}
        </motion.div>
      </div>

      {/* ── Features (banner ngang) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ease: [0.22, 0.8, 0.22, 1] }}
        className="relative"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-white">Tính năng nổi bật</h2>
          </div>
          <span className="text-[11px] text-white/30 hidden sm:block">← cuộn ngang để xem thêm →</span>
        </div>

        {/* Horizontal scrolling banner — fades on edges, snaps on each card,
            auto-shines a sweep across when first revealed. */}
        <div className="relative">
          {/* Edge fade masks */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10"
            style={{ background: 'linear-gradient(90deg, #0c0c14 0%, transparent)' }} />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10"
            style={{ background: 'linear-gradient(270deg, #0c0c14 0%, transparent)' }} />

          <div
            className="flex gap-4 overflow-x-auto pb-3 px-1 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 + 0.45, ease: [0.22, 0.8, 0.22, 1] }}
                className="flex-shrink-0 snap-start"
                style={{ width: 'min(340px, 80vw)' }}
              >
                <Link
                  to={f.link}
                  className="group relative h-full flex items-center gap-4 rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(135deg, ${f.accent}15 0%, rgba(255,255,255,0.02) 60%)`,
                    border: `1px solid ${f.accent}33`,
                    backdropFilter: 'blur(16px)',
                    boxShadow: `0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px ${f.accent}10 inset`,
                  }}
                >
                  {/* Decorative orb */}
                  <div
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle, ${f.accent}55 0%, transparent 70%)` }}
                  />
                  {/* Sheen sweep on hover */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                      transform: 'translateX(-110%)',
                      animation: 'shimmer 2.5s ease infinite',
                    }}
                  />

                  {/* Icon tile */}
                  <div
                    className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{
                      background: `${f.accent}25`,
                      border: `1px solid ${f.accent}55`,
                      boxShadow: `0 0 20px -4px ${f.accent}66`,
                    }}
                  >
                    <span className="select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{f.icon}</span>
                  </div>

                  {/* Text */}
                  <div className="relative min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm mb-1 truncate flex items-center gap-2">
                      {f.title}
                      <ArrowRight
                        size={12}
                        className="text-white/30 group-hover:text-white/80 group-hover:translate-x-1 transition-all"
                      />
                    </h3>
                    <p className="text-xs text-white/45 leading-relaxed line-clamp-2">{f.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Reviews ── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <MessageSquare size={13} className="text-rose-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-white">Đánh giá từ cộng đồng</h2>
          </div>
          {user && (
            <button
              onClick={() => setShowReviewForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: showReviewForm ? 'rgba(239,68,68,0.12)' : 'rgba(110,75,255,0.12)',
                border: showReviewForm ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(110,75,255,0.3)',
                color: showReviewForm ? 'rgba(252,165,165,1)' : 'rgba(167,139,250,1)',
              }}>
              <MessageSquare size={12} />
              {showReviewForm ? 'Hủy' : 'Viết đánh giá'}
            </button>
          )}
        </div>

        {showReviewForm && user && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-4 rounded-2xl"
            style={{ background: 'rgba(110,75,255,0.08)', border: '1px solid rgba(110,75,255,0.2)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(110,75,255,0.25)', color: 'rgba(167,139,250,1)' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{user.name}</p>
                <p className="text-[10px] text-white/40">Viết đánh giá của bạn</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mb-3">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}>
                  <Star size={18} className={n <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />
                </button>
              ))}
              <span className="text-xs text-white/40 ml-2">{reviewForm.rating}/5</span>
            </div>
            <select
              value={reviewForm.product}
              onChange={e => setReviewForm(f => ({ ...f, product: e.target.value }))}
              className="w-full mb-3 px-3 py-2 rounded-xl text-xs text-white/70 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {['Chung', 'Cửa hàng', 'Xóa nền AI', 'Tài nguyên', 'Hộp quà'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <textarea
              value={reviewForm.text}
              onChange={e => setReviewForm(f => ({ ...f, text: e.target.value }))}
              placeholder="Chia sẻ trải nghiệm của bạn với cộng đồng..."
              rows={3}
              className="w-full mb-3 px-3 py-2 rounded-xl text-xs text-white/80 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowReviewForm(false)}
                className="flex-1 py-2 rounded-xl text-xs text-white/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Hủy
              </button>
              <button onClick={submitReview}
                disabled={!reviewForm.text.trim() || reviewSubmitting}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)', color: '#fff' }}>
                {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allReviews.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.3, ease: [0.22, 0.8, 0.22, 1] }}
              className="relative rounded-2xl p-5 flex flex-col gap-3 group hover:-translate-y-1 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* Top accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-40 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }} />
              {/* Header: avatar + name */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}35` }}>
                  {r.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white/85 truncate">{r.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{r.product}</p>
                </div>
              </div>
              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} size={12}
                    className={idx < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'} />
                ))}
                <span className="text-[10px] text-white/30 ml-1.5">{r.rating}.0</span>
              </div>
              {/* Review text */}
              <p className="text-[11px] text-white/55 leading-relaxed flex-1 line-clamp-3">"{r.text}"</p>
              {/* Time */}
              <div className="flex items-center gap-1 text-[9px] text-white/25 pt-1">
                <Clock size={8} />{r.time}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Social proof ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, ease: [0.22, 0.8, 0.22, 1] }}
        className="relative flex flex-col sm:flex-row items-center justify-between gap-5 rounded-2xl px-6 py-5 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 0 1px rgba(110,75,255,0.15), 0 8px 32px rgba(0,0,0,0.25)',
        }}>
        {/* Animated gradient border top */}
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(110,75,255,0.6), rgba(77,208,255,0.6), rgba(43,242,192,0.4), transparent)' }} />
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2.5">
            {[260, 200, 280, 320, 340].map((h, i) => (
              <div key={i} className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white"
                style={{ borderColor: '#0c0c14', background: `hsl(${h},60%,55%)` }}>
                {['A','B','C','D','E'][i]}
              </div>
            ))}
          </div>
          <div>
            <p className="text-base font-bold text-white flex items-center gap-1.5">
              50,000+ designer
              <CheckCircle2 size={14} className="text-cyan-400" />
            </p>
            <p className="text-xs text-white/40">đang tin dùng NOVA AI Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={15} className="text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <span className="text-base font-bold text-white">4.9</span>
          <span className="text-xs text-white/40">/ 5 · <span className="text-white/60 font-medium">2,341</span> đánh giá</span>
        </div>
      </motion.div>
    </div>
  )
}
