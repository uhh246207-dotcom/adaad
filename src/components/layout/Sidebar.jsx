import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ShoppingBag, Gift, Scissors,
  FolderOpen, LogOut, X, ChevronLeft, ChevronRight,
  Sparkles, Layers, Bell, Code2, BookOpen,
  Download,
} from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useAppStore } from '../../store/useAppStore'
import clsx from 'clsx'

// Primary navigation — the "main verbs" of the app, always full-width.
const NAV_ITEMS = [
  { to: '/',                icon: LayoutDashboard, label: 'Dashboard',      end: true },
  { to: '/shop',            icon: ShoppingBag,     label: 'Cửa hàng' },
  { to: '/remove-bg',       icon: Scissors,        label: 'Xóa nền AI',     badge: 'AI' },
  { to: '/resources',       icon: FolderOpen,      label: 'Tài nguyên' },
  { to: '/source',          icon: Code2,           label: 'Mã nguồn' },
  { to: '/downloads',       icon: Download,        label: 'Đã tải',         loginOnly: true },
  { to: '/admin/psd',       icon: Layers,          label: 'PSD Admin',      badge: 'NEW', adminOnly: true },
]

// Utility cluster — secondary destinations rendered as small icon buttons
// at the bottom of the sidebar so they don't crowd the main menu.
const UTILITY_ITEMS = [
  { to: '/gift',          icon: Gift,     label: 'Hộp quà',  tone: '#10b981', dot: true },
  { to: '/announcements', icon: Bell,     label: 'Thông báo', tone: '#f59e0b', dot: true },
  { to: '/intro',         icon: BookOpen, label: 'Giới thiệu', tone: '#4dd0ff' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const isAdmin = useAuthStore(s => s.isAdmin())
  const { sidebarOpen, setSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen, toast } = useAppStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast('Đã đăng xuất', 'success', 'Hẹn gặp lại!')
    navigate('/auth')
  }

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]',
        !sidebarOpen && !mobile && 'justify-center px-2')}>
        <div className="relative flex-shrink-0 group/logo">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-violet-400 to-cyan-400 flex items-center justify-center shadow-glow-sm transition-all duration-500 group-hover/logo:shadow-glow-md group-hover/logo:scale-105"
            style={{ backgroundSize: '200% 200%', animation: 'gradientFlow 6s ease infinite' }}>
            <Sparkles size={18} className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-dark-200 anim-ring-pulse" />
        </div>
        <AnimatePresence>
          {(sidebarOpen || mobile) && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="font-display font-bold text-white text-lg leading-none">NOVA</p>
              <p className="text-[10px] text-white/40 font-medium tracking-widest uppercase">AI Studio</p>
            </motion.div>
          )}
        </AnimatePresence>
        {mobile && (
          <button onClick={() => setMobileSidebarOpen(false)}
            className="ml-auto p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge, end, adminOnly, loginOnly }) => {
          if (adminOnly && !isAdmin) return null
          if (loginOnly && !user) return null
          return (
          <NavLink key={to} to={to} end={end}
            onClick={() => mobile && setMobileSidebarOpen(false)}
            className={({ isActive }) => clsx(
              'relative flex items-center gap-3 rounded-xl transition-all duration-300 group overflow-hidden',
              sidebarOpen || mobile ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center',
              isActive
                ? 'text-white border border-brand-500/40'
                : 'text-white/50 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08]'
            )}
            style={({ isActive } = {}) => isActive ? {
              boxShadow: '0 0 0 1px rgba(110,75,255,0.25), 0 6px 20px -6px rgba(110,75,255,0.5)',
            } : {}}>
            {({ isActive }) => (<>
              {isActive && (
                <>
                  <motion.div layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(90deg, rgba(110,75,255,0.22), rgba(77,208,255,0.14) 60%, transparent)',
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
                  <motion.span layoutId="nav-stripe"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg, #6e4bff, #4dd0ff)', boxShadow: '0 0 8px rgba(110,75,255,0.7)' }} />
                </>
              )}
              <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
                  transform: 'translateX(-100%)',
                  animation: 'shimmer 2.2s ease infinite',
                }} />
              <div className={clsx('relative flex-shrink-0 transition-all duration-300',
                isActive ? 'text-brand-200' : 'text-white/40 group-hover:text-white/85')}
                style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(124,92,255,0.65))' } : {}}>
                <Icon size={18} className="group-hover:scale-110 transition-transform" />
              </div>
              <AnimatePresence>
                {(sidebarOpen || mobile) && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="relative text-sm font-medium flex-1 truncate">
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {badge && (sidebarOpen || mobile) && (
                <span className={clsx('relative text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-shadow duration-300',
                  badge === 'AI' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 group-hover:shadow-[0_0_10px_rgba(77,208,255,0.55)]'
                    : badge === 'NEW' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 group-hover:shadow-[0_0_10px_rgba(124,92,255,0.55)]'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 group-hover:shadow-[0_0_10px_rgba(244,63,94,0.55)]')}>
                  {badge}
                </span>
              )}
            </>)}
          </NavLink>
          )
        })}
      </nav>

      {/* ── Utility cluster ── compact icon row for secondary destinations.
            Renders as a tooltip-equipped row when expanded, single-column
            stack when collapsed. */}
      <div className="px-2 pb-1">
        <div
          className={clsx(
            'rounded-xl border border-white/[0.05] bg-white/[0.015]',
            sidebarOpen || mobile
              ? 'flex items-center gap-1 px-1.5 py-1.5 justify-around'
              : 'flex flex-col items-center gap-1 p-1.5',
          )}
        >
          {UTILITY_ITEMS.map(({ to, icon: Icon, label, tone, dot }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => mobile && setMobileSidebarOpen(false)}
              title={label}
              className={({ isActive }) => clsx(
                'relative w-9 h-9 rounded-lg flex items-center justify-center transition-all group/util',
                isActive
                  ? 'text-white'
                  : 'text-white/45 hover:text-white hover:bg-white/[0.06]',
              )}
              style={({ isActive } = {}) => isActive ? {
                background: `${tone}20`,
                boxShadow: `inset 0 0 0 1px ${tone}55, 0 0 12px -2px ${tone}66`,
              } : {}}
            >
              <Icon size={15} className="transition-transform group-hover/util:scale-110" />
              {dot && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: tone, boxShadow: `0 0 6px ${tone}` }}
                />
              )}
              {/* Tooltip on hover when collapsed */}
              {!sidebarOpen && !mobile && (
                <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md text-[10px] font-medium text-white whitespace-nowrap opacity-0 -translate-x-1 group-hover/util:opacity-100 group-hover/util:translate-x-0 transition-all"
                  style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* User + Actions */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className={clsx('w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.05] transition-all text-sm',
              !sidebarOpen && 'justify-center')}>
            {sidebarOpen
              ? <><ChevronLeft size={16} /><span className="text-xs">Thu gọn</span></>
              : <ChevronRight size={16} />}
          </button>
        )}

        {user && (
          <div className={clsx('flex items-center gap-3 px-2 py-2',
            !sidebarOpen && !mobile && 'justify-center')}>
            <img src={user.avatar} alt={user.name}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-white/10" />
            <AnimatePresence>
              {(sidebarOpen || mobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-white/40 truncate">{user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {(sidebarOpen || mobile) && (
              <button onClick={handleLogout} title="Đăng xuất"
                className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex-shrink-0">
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 220 : 64 }}
        transition={{ duration: 0.25, ease: [0.22, 0.8, 0.22, 1] }}
        className="hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.025)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
        }}>
        <SidebarContent />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col lg:hidden"
              style={{
                background: 'rgba(14,14,24,0.95)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(32px)',
              }}>
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
