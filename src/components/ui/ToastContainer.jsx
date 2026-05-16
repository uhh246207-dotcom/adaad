import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const ICONS = {
  success: <CheckCircle size={18} className="text-emerald-400" />,
  error:   <XCircle size={18} className="text-rose-400" />,
  info:    <Info size={18} className="text-cyan-400" />,
  warn:    <AlertTriangle size={18} className="text-amber-400" />,
}
const COLORS = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error:   'border-rose-500/30 bg-rose-500/10',
  info:    'border-cyan-500/30 bg-cyan-500/10',
  warn:    'border-amber-500/30 bg-amber-500/10',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore()
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border max-w-sm
              backdrop-blur-2xl shadow-glass ${COLORS[t.type] || COLORS.info}`}
            style={{ background: 'rgba(12,12,20,0.88)' }}>
            <div className="flex-shrink-0 mt-0.5">{ICONS[t.type]}</div>
            <div className="flex-1 min-w-0">
              {t.title && <p className="text-sm font-semibold text-white mb-0.5">{t.title}</p>}
              <p className="text-sm text-white/70 leading-snug">{t.message}</p>
            </div>
            <button onClick={() => removeToast(t.id)}
              className="flex-shrink-0 p-0.5 text-white/30 hover:text-white/70 transition-colors mt-0.5">
              <X size={14} />
            </button>
            {/* Progress bar */}
            <motion.div className="absolute bottom-0 left-0 h-0.5 rounded-full opacity-50"
              style={{ background: 'currentColor' }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 3.2, ease: 'linear' }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
