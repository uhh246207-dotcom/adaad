import { Link, useNavigate } from 'react-router-dom'
import { Menu, Coins, LogIn, UserPlus, Bell, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/useAuthStore'
import { useAppStore } from '../../store/useAppStore'

export default function Topbar({ title = '' }) {
  const { user } = useAuthStore()
  const { setMobileSidebarOpen } = useAppStore()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 relative overflow-visible"
      style={{
        background: 'rgba(12,12,20,0.78)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}>
      {/* subtle animated gradient line at the very bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(110,75,255,0.45), rgba(77,208,255,0.4), rgba(43,242,192,0.35), transparent)',
          backgroundSize: '300% 100%',
          animation: 'shimmer 6s linear infinite',
        }} />

      {/* Mobile hamburger */}
      <button onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all">
        <Menu size={20} />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="font-display font-semibold text-white/90 text-base hidden sm:block">{title}</h1>
      )}

      {/* Search bar with shimmer focus */}
      <div className="flex-1 max-w-sm hidden md:block group/search">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 transition-all duration-300 group-focus-within/search:text-brand-400 group-focus-within/search:scale-110" />
          <input placeholder="Tìm kiếm sản phẩm, tài nguyên..."
            className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none transition-all duration-300"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(110,75,255,0.55)'
              e.target.style.boxShadow = '0 0 0 3px rgba(110,75,255,0.15), 0 0 22px -6px rgba(110,75,255,0.55)'
              e.target.style.background = 'rgba(255,255,255,0.06)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.07)'
              e.target.style.boxShadow = 'none'
              e.target.style.background = 'rgba(255,255,255,0.04)'
            }}
          />
          {/* shortcut hint */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-focus-within/search:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-white/40"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ⌘K
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            {/* Balance pill */}
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/topup')}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, rgba(250,204,21,0.14), rgba(251,146,60,0.08))',
                border: '1px solid rgba(250,204,21,0.28)',
                color: '#fde047',
                boxShadow: '0 0 18px -8px rgba(250,204,21,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}>
              {/* shine sweep */}
              <span className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
                  transform: 'translateX(-110%)',
                  animation: 'shimmer 4s ease infinite',
                }} />
              <Coins size={15} className="text-yellow-400 transition-transform group-hover:rotate-12" />
              <span className="relative">{user.balance.toLocaleString('vi-VN')}đ</span>
            </motion.button>

            {/* Notif */}
            <button className="relative p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all group/bell">
              <Bell size={18} className="group-hover/bell:rotate-12 transition-transform" />
              <span className="absolute top-1.5 right-1.5 flex">
                <span className="absolute w-2 h-2 rounded-full bg-brand-400 anim-ring-pulse" />
                <span className="w-2 h-2 rounded-full bg-brand-400" />
              </span>
            </button>

            {/* Avatar */}
            <button onClick={() => navigate('/topup')} className="relative flex items-center gap-2 group">
              <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -m-0.5"
                style={{ background: 'linear-gradient(135deg, #6e4bff, #4dd0ff)', filter: 'blur(8px)' }} />
              <img src={user.avatar} alt={user.name}
                className="relative w-8 h-8 rounded-xl object-cover border border-white/10 group-hover:border-brand-400/60 transition-all" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-dark-200" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/auth?tab=login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all hover:scale-[1.03]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <LogIn size={15} />
              Đăng nhập
            </Link>
            <Link to="/auth?tab=register"
              className="btn-primary flex items-center gap-1.5 text-xs">
              <UserPlus size={14} />
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
