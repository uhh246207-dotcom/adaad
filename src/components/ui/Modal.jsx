import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className={`relative w-full ${maxW[size]} rounded-3xl overflow-hidden shadow-glass-lg`}
            style={{
              background: 'rgba(14,14,24,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(40px)',
            }}>
            {/* Top rim highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <h3 className="font-display font-semibold text-white">{title}</h3>
                <button onClick={onClose}
                  className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="relative z-10">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
