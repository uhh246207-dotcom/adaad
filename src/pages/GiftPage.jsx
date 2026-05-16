import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Copy, CheckCheck, Sparkles, Star, Zap, Crown, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import confetti from '../utils/confetti'

const GIFT_ITEMS = [
  {
    id: 'gift-01',
    type: 'coupon',
    title: '20% OFF',
    desc: 'Giảm 20% cho đơn hàng đầu tiên',
    code: 'NOVA20OFF',
    value: '20%',
    color: 'from-brand-600 to-brand-400',
    icon: Star,
    expiry: '31/12/2026',
    condition: 'Tất cả sản phẩm',
  },
  {
    id: 'gift-02',
    type: 'voucher',
    title: '50.000đ',
    desc: 'Voucher giảm giá 50.000đ khi mua từ 200.000đ',
    code: 'NOVA50K',
    value: '50K',
    color: 'from-cyan-600 to-cyan-400',
    icon: Zap,
    expiry: '30/06/2026',
    condition: 'Đơn hàng ≥ 200.000đ',
  },
  {
    id: 'gift-03',
    type: 'premium',
    title: 'VIP 7 ngày',
    desc: 'Trải nghiệm Premium 7 ngày miễn phí',
    code: 'NOVAVIP7',
    value: 'VIP',
    color: 'from-amber-600 to-orange-400',
    icon: Crown,
    expiry: '31/12/2026',
    condition: 'Tài khoản mới',
  },
  {
    id: 'gift-04',
    type: 'coupon',
    title: '100.000đ',
    desc: 'Tặng 100.000đ vào ví khi mời bạn bè',
    code: 'REFERRAL100',
    value: '100K',
    color: 'from-emerald-600 to-teal-400',
    icon: Sparkles,
    expiry: '31/12/2026',
    condition: 'Mỗi lần giới thiệu',
  },
]

function GiftCard({ item, onClaim, claimed }) {
  const Icon = item.icon
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(item.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] group"
      style={{ background: 'rgba(255,255,255,0.03)' }}>

      {/* Gradient top accent */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.color}`} />

      {/* Decorative circles */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${item.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-gradient-to-br ${item.color} opacity-5`} />

      {/* Dashed left cutout */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
        <div className="w-4 h-4 rounded-full -ml-2 bg-dark-200 border border-white/[0.06]" />
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <div className="w-4 h-4 rounded-full -mr-2 bg-dark-200 border border-white/[0.06]" />
      </div>
      <div className="absolute top-1/2 left-12 right-12 border-b border-dashed border-white/[0.06]" />

      <div className="p-5 relative z-10">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
            <Icon size={20} className="text-white" />
          </div>
          <div className="text-right">
            <div className={`text-2xl font-display font-black bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
              {item.value}
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{item.type}</div>
          </div>
        </div>

        {/* Info */}
        <h3 className="font-display font-bold text-white text-base mb-1">{item.title}</h3>
        <p className="text-xs text-white/50 mb-3 leading-relaxed">{item.desc}</p>

        <div className="flex items-center gap-3 text-[10px] text-white/30 mb-4">
          <span>HSD: {item.expiry}</span>
          <span>·</span>
          <span>{item.condition}</span>
        </div>

        {/* Separator dots */}
        <div className="flex items-center gap-1 mb-4 justify-center">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-1 h-px bg-white/10" />
          ))}
        </div>

        {/* Code + actions */}
        {claimed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg font-mono text-xs"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}>
              <span className="text-white font-semibold tracking-widest">{item.code}</span>
              <button onClick={copy} className="text-white/40 hover:text-white transition-colors ml-2">
                {copied ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => onClaim(item)}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r ${item.color} text-white hover:opacity-90 hover:shadow-lg active:scale-95`}>
            🎁 Nhận mã
          </button>
        )}
      </div>
    </motion.div>
  )
}

function RandomCodeModal({ onClose, code }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 18, stiffness: 280 }}
        className="relative z-10 w-full max-w-sm text-center rounded-3xl overflow-hidden"
        style={{ background: 'rgba(14,14,24,0.97)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
        <div className="p-8">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 12 }}
            className="text-6xl mb-4">🎉</motion.div>
          <h3 className="font-display text-xl font-bold text-white mb-2">Chúc mừng!</h3>
          <p className="text-sm text-white/50 mb-6">Bạn nhận được mã giảm giá ngẫu nhiên:</p>
          <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-2xl mb-6"
            style={{ background: 'rgba(110,75,255,0.1)', border: '1px dashed rgba(110,75,255,0.4)' }}>
            <span className="font-mono text-xl font-black text-white tracking-widest">{code}</span>
            <button onClick={copy} className="text-white/40 hover:text-white transition-colors">
              {copied ? <CheckCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
          <button onClick={onClose} className="btn-primary w-full py-3 text-sm">Tuyệt vời!</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function GiftPage() {
  const [claimed, setClaimed] = useState({})
  const [showRandom, setShowRandom] = useState(false)
  const [randomCode, setRandomCode] = useState('')
  const [spinning, setSpinning] = useState(false)
  const { user } = useAuthStore()
  const { toast } = useAppStore()

  const claimGift = (item) => {
    if (!user) { toast('Vui lòng đăng nhập để nhận quà', 'warn', 'Chưa đăng nhập'); return }
    setClaimed(prev => ({ ...prev, [item.id]: true }))
    confetti()
    toast(`Đã nhận mã "${item.code}" thành công! 🎁`, 'success', 'Nhận quà thành công')
  }

  const getRandomCode = () => {
    if (!user) { toast('Vui lòng đăng nhập để quay số', 'warn'); return }
    setSpinning(true)
    setTimeout(() => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const code = 'NOVA' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      setRandomCode(code)
      setSpinning(false)
      setShowRandom(true)
      confetti()
    }, 1500)
  }

  const [canSpin, setCanSpin] = useState(true)
  const handleSpin = () => {
    if (!canSpin) return
    setCanSpin(false)
    getRandomCode()
    setTimeout(() => setCanSpin(true), 10000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center gap-2 badge mb-3">
          <Gift size={13} /> Hộp quà & Voucher
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Nhận <span className="grad">quà miễn phí</span>
        </h1>
        <p className="text-white/40 text-sm">Mã giảm giá, voucher và phần thưởng độc quyền dành cho bạn</p>
      </motion.div>

      {/* Random spin */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="relative overflow-hidden rounded-3xl p-8 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(110,75,255,0.15), rgba(77,208,255,0.1))', border: '1px solid rgba(110,75,255,0.2)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-cyan-500/5" />
        </div>
        <div className="relative">
          <motion.div
            animate={spinning ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.8, repeat: spinning ? Infinity : 0 }}
            className="text-5xl mb-4 inline-block">
            🎰
          </motion.div>
          <h2 className="font-display text-xl font-bold text-white mb-2">Quay số nhận mã ngẫu nhiên</h2>
          <p className="text-sm text-white/50 mb-5">Mỗi tài khoản được quay 1 lần / 10 giây. Mã có thể giảm 5% - 50%!</p>
          <button onClick={handleSpin} disabled={!canSpin || spinning}
            className={`inline-flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold text-sm transition-all
              ${canSpin && !spinning ? 'btn-primary cursor-pointer' : 'opacity-50 cursor-not-allowed glass text-white/50'}`}>
            {spinning ? <><RefreshCw size={15} className="animate-spin" /> Đang quay...</>
              : <><Sparkles size={15} /> Quay ngay</>}
          </button>
        </div>
      </motion.div>

      {/* Gift cards grid */}
      <div>
        <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-brand-400">✦</span> Mã có sẵn
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GIFT_ITEMS.map((item, i) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.2 }}>
              <GiftCard item={item} onClaim={claimGift} claimed={!!claimed[item.id]} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* How to use */}
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-cyan-400" /> Cách sử dụng mã
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Nhận mã', desc: 'Bấm "Nhận mã" để lấy code giảm giá của bạn' },
            { step: '02', title: 'Copy mã', desc: 'Sao chép mã code bằng icon copy bên cạnh' },
            { step: '03', title: 'Áp dụng', desc: 'Dán mã khi thanh toán trong cửa hàng' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showRandom && <RandomCodeModal code={randomCode} onClose={() => setShowRandom(false)} />}
      </AnimatePresence>
    </div>
  )
}
