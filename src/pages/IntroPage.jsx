import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Sparkles, Scissors, ShoppingBag, FolderOpen,
  ArrowRight, Play, Zap, Code2, Palette, MousePointer2,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Scissors,
    title: 'Xóa nền AI',
    desc: 'Tách nền ảnh tự động chỉ trong 1-3 giây. Chạy 100% trên trình duyệt, không cần server.',
    color: '#0ea5e9',
    link: '/remove-bg',
  },
  {
    icon: ShoppingBag,
    title: 'Cửa hàng thiết kế',
    desc: 'Mua thumbnail, logo, banner chất lượng cao — tải về sử dụng ngay.',
    color: '#10b981',
    link: '/shop',
  },
  {
    icon: FolderOpen,
    title: 'Kho tài nguyên',
    desc: '10,000+ file PSD, icon, mockup miễn phí. Cập nhật liên tục mỗi tuần.',
    color: '#8b5cf6',
    link: '/resources',
  },
  {
    icon: Code2,
    title: 'Source Code',
    desc: 'Mua bộ code template, layout, ứng dụng nhỏ — đầy đủ tài liệu.',
    color: '#f59e0b',
    link: '/source',
  },
]

const STEPS = [
  { num: '01', title: 'Đăng ký / Đăng nhập', desc: 'Tạo tài khoản miễn phí để bắt đầu sử dụng tất cả tính năng', icon: MousePointer2 },
  { num: '02', title: 'Chọn công cụ', desc: 'Xóa nền AI, Cửa hàng thiết kế hoặc Kho tài nguyên', icon: Palette },
  { num: '03', title: 'Tải về & Sử dụng', desc: 'Tải file chất lượng cao về máy và dùng cho dự án của bạn', icon: Zap },
]

export default function IntroPage() {
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-5"
      >
        <div className="inline-flex items-center gap-2 badge mb-2">
          <Sparkles size={13} /> Giới thiệu
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
          Nền tảng thiết kế<br />
          <span className="grad">AI thế hệ mới</span>
        </h1>
        <p className="text-white/50 text-base max-w-2xl mx-auto leading-relaxed">
          NOVA AI Studio giúp bạn tạo thumbnail, logo, banner chuyên nghiệp chỉ với vài click.
          Tất cả chạy trên trình duyệt — không cần cài đặt phần mềm.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link to="/auth?tab=register" className="btn-primary flex items-center gap-2 px-6 py-3 text-sm">
            <Sparkles size={15} /> Bắt đầu miễn phí
          </Link>
          <Link to="/" className="btn-ghost flex items-center gap-2 px-5 py-3 text-sm">
            <Play size={14} /> Xem Dashboard
          </Link>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Zap size={14} className="text-cyan-400" />
          </div>
          <h2 className="font-display text-lg font-semibold text-white">Cách sử dụng</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              className="relative glass-card p-5 text-center group"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(90deg, transparent, #4dd0ff, transparent)' }} />
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(77,208,255,0.12)', border: '1px solid rgba(77,208,255,0.25)' }}>
                <step.icon size={20} className="text-cyan-400" />
              </div>
              <div className="text-[10px] text-cyan-400/70 font-bold tracking-widest mb-1">{step.num}</div>
              <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <Code2 size={14} className="text-brand-400" />
          </div>
          <h2 className="font-display text-lg font-semibold text-white">Tính năng chính</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 + 0.35 }}
            >
              <Link
                to={f.link}
                className="relative overflow-hidden glass-card p-5 flex gap-4 group block h-full"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${f.color}, transparent)` }} />
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}35` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    {f.title}
                    <ArrowRight size={12} className="text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tech stack */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Code2 size={15} className="text-brand-400" /> Mã nguồn & Công nghệ
        </h3>
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { name: 'React 18', desc: 'UI Framework', color: 'text-cyan-400' },
            { name: 'Vite', desc: 'Build Tool', color: 'text-emerald-400' },
            { name: 'Tailwind CSS', desc: 'Styling', color: 'text-violet-400' },
            { name: 'Zustand', desc: 'State Management', color: 'text-amber-400' },
          ].map(t => (
            <div key={t.name} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className={`text-xs font-mono font-semibold ${t.color}`}>{t.name}</p>
              <p className="text-[10px] text-white/35 mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
