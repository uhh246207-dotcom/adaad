import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronDown, BookOpen, HelpCircle, X } from 'lucide-react'
import clsx from 'clsx'

/**
 * GuideSection — collapsible / floating step-by-step guide.
 *
 * Two variants:
 *   1. inline (default) — collapsible card embedded in page flow.
 *   2. floating          — a small "?" button anchored to bottom-right
 *      of the viewport that opens a popover. Use for full-screen editors
 *      (PSD Editor, AI Composer) where vertical space is precious.
 *
 * The body always uses the same layout: a compact horizontal stepper
 * with progress line + the active step's detail card below it.
 *
 * Props
 *  - title, subtitle
 *  - steps: [{ icon, title, desc, tip? }]
 *  - tips:  [string]
 *  - accent: 'brand' | 'cyan' | 'pink' | 'emerald' | 'amber'
 *  - icon: lucide icon component for the header
 *  - badgeText: small uppercase pill (defaults to "{n} bước")
 *  - defaultOpen: whether the body is expanded on mount (default: true)
 *  - compact: tighter padding for in-page embedding
 *  - floating: render as a floating help button (overrides inline)
 *  - floatPosition: 'br' (default) | 'bl' | 'tr' | 'tl'
 */

const ACCENTS = {
  brand:   { color: '#7c5cff', soft: '124,92,255',  text: 'text-brand-300' },
  cyan:    { color: '#4dd0ff', soft: '77,208,255',  text: 'text-cyan-300' },
  pink:    { color: '#f472b6', soft: '244,114,182', text: 'text-pink-300' },
  emerald: { color: '#2bf2c0', soft: '43,242,192',  text: 'text-emerald-300' },
  amber:   { color: '#fbbf24', soft: '251,191,36',  text: 'text-amber-300' },
}

const FLOAT_POS = {
  br: 'bottom-4 right-4 sm:bottom-6 sm:right-6',
  bl: 'bottom-4 left-4 sm:bottom-6 sm:left-6',
  tr: 'top-4 right-4 sm:top-6 sm:right-6',
  tl: 'top-4 left-4 sm:top-6 sm:left-6',
}

export default function GuideSection({
  title = 'Hướng dẫn sử dụng',
  subtitle,
  steps = [],
  tips = [],
  accent = 'brand',
  icon: HeaderIcon = BookOpen,
  badgeText,
  defaultOpen = true,
  compact = false,
  floating = false,
  floatPosition = 'br',
  className = '',
}) {
  const c = ACCENTS[accent] || ACCENTS.brand
  const accentRgb = c.soft
  const stepCount = steps.length
  const finalBadge = badgeText ?? (stepCount > 0 ? `${stepCount} bước` : null)

  const [open, setOpen] = useState(floating ? false : defaultOpen)
  const [active, setActive] = useState(0)
  const safeActive = Math.min(active, Math.max(0, stepCount - 1))

  /* Floating variant: a button that opens an absolutely-positioned popover.
     Renders into a portal so it always escapes any parent overflow:hidden
     (very common in editor layouts). */
  if (floating) {
    return <FloatingGuide
      title={title}
      subtitle={subtitle}
      steps={steps}
      tips={tips}
      accent={c}
      accentRgb={accentRgb}
      headerIcon={HeaderIcon}
      finalBadge={finalBadge}
      open={open}
      setOpen={setOpen}
      active={safeActive}
      setActive={setActive}
      floatPosition={floatPosition}
    />
  }

  /* Inline variant — kept as a collapsible card. */
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, ease: [0.22, 0.8, 0.22, 1] }}
      className={clsx('relative rounded-2xl overflow-hidden', className)}
      style={{
        background: `linear-gradient(135deg, rgba(${accentRgb},0.05), rgba(255,255,255,0.012))`,
        border: `1px solid rgba(${accentRgb},0.2)`,
        backdropFilter: 'blur(16px) saturate(150%)',
        boxShadow: `0 4px 18px rgba(0,0,0,0.18)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${c.color}, transparent)` }}
      />

      <Header
        open={open}
        setOpen={setOpen}
        accent={c}
        accentRgb={accentRgb}
        HeaderIcon={HeaderIcon}
        title={title}
        subtitle={subtitle}
        finalBadge={finalBadge}
        compact={compact}
      />

      <AnimatePresence initial={false}>
        {open && (stepCount > 0 || tips.length > 0) && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.8, 0.22, 1] }}
            className="overflow-hidden"
          >
            <div
              className={clsx('border-t', compact ? 'px-4 py-4' : 'px-5 py-5')}
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <Body
                steps={steps}
                tips={tips}
                active={safeActive}
                setActive={setActive}
                accent={c}
                accentRgb={accentRgb}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

/* ─── Header (used by inline variant) ────────────────────────────────────── */
function Header({ open, setOpen, accent, accentRgb, HeaderIcon, title, subtitle, finalBadge, compact }) {
  return (
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      className={clsx(
        'relative w-full text-left flex items-center gap-3 transition-colors hover:bg-white/[0.02]',
        compact ? 'px-4 py-3' : 'px-5 py-4',
      )}
    >
      <div
        className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `rgba(${accentRgb},0.14)`,
          border: `1px solid rgba(${accentRgb},0.3)`,
          boxShadow: `0 0 14px -6px rgba(${accentRgb},0.5)`,
        }}
      >
        <HeaderIcon size={16} style={{ color: accent.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-semibold text-white text-sm sm:text-[15px] leading-tight">
            {title}
          </h3>
          {finalBadge && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
              style={{
                background: `rgba(${accentRgb},0.18)`,
                color: accent.color,
                border: `1px solid rgba(${accentRgb},0.35)`,
              }}
            >
              {finalBadge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-white/45 mt-0.5 leading-snug truncate">
            {subtitle}
          </p>
        )}
      </div>

      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s cubic-bezier(0.22,0.8,0.22,1)',
        }}
      >
        <ChevronDown size={14} className="text-white/50" />
      </div>
    </button>
  )
}

/* ─── Body (stepper + active step card + tips) ───────────────────────────── */
function Body({ steps, tips, active, setActive, accent, accentRgb }) {
  const currentStep = steps[active]
  const StepIcon = currentStep?.icon
  return (
    <>
      {steps.length > 0 && (
        <Stepper
          steps={steps}
          active={active}
          onActive={setActive}
          accent={accent}
          accentRgb={accentRgb}
        />
      )}

      {currentStep && (
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className={clsx('mt-5 rounded-xl', steps.length > 0 ? 'p-4' : '')}
          style={
            steps.length > 0
              ? {
                  background: `rgba(${accentRgb},0.045)`,
                  border: `1px solid rgba(${accentRgb},0.13)`,
                }
              : {}
          }
        >
          <div className="flex items-start gap-3">
            {StepIcon && (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `rgba(${accentRgb},0.18)`,
                  border: `1px solid rgba(${accentRgb},0.3)`,
                }}
              >
                <StepIcon size={15} style={{ color: accent.color }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] uppercase tracking-widest font-semibold mb-0.5"
                style={{ color: accent.color }}
              >
                Bước {active + 1} / {steps.length}
              </p>
              <h4 className="text-sm font-semibold text-white">{currentStep.title}</h4>
              <p className="text-xs text-white/55 mt-1 leading-relaxed">{currentStep.desc}</p>
              {currentStep.tip && (
                <div
                  className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug rounded-lg px-2.5 py-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Lightbulb size={11} className={clsx('flex-shrink-0 mt-0.5', accent.text)} />
                  <span className="text-white/65">{currentStep.tip}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {tips.length > 0 && (
        <div
          className="mt-4 rounded-xl px-3.5 py-3"
          style={{
            background: 'rgba(255,255,255,0.018)',
            border: '1px dashed rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb size={11} className={accent.text} />
            <span className="text-[10px] font-semibold text-white/55 uppercase tracking-wider">
              Mẹo nhỏ
            </span>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="text-[11px] text-white/55 leading-relaxed flex items-start gap-1.5"
              >
                <span
                  className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: accent.color }}
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

/* ─── Floating help button + popover ─────────────────────────────────────── */
function FloatingGuide({
  title, subtitle, steps, tips, accent, accentRgb, headerIcon: HeaderIcon, finalBadge,
  open, setOpen, active, setActive, floatPosition,
}) {
  const stepCount = steps.length
  // Use a portal so the popover escapes any parent's `overflow: hidden`
  // (PsdEditor / AIComposer layouts both clip).
  const [target, setTarget] = useState(null)
  useEffect(() => { setTarget(document.body) }, [])

  // Press ? or Escape to toggle/close.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return
      if (e.key === 'Escape' && open) setOpen(false)
      if (e.key === '?') setOpen(o => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!target) return null

  // Place the popover relative to the button, on the inverse side.
  const isBottom = floatPosition.startsWith('b')
  const isRight  = floatPosition.endsWith('r')
  const popoverPosClasses = clsx(
    'absolute',
    isBottom ? 'bottom-14' : 'top-14',
    isRight  ? 'right-0'   : 'left-0',
  )

  const ui = (
    <div className={clsx('fixed z-[60] pointer-events-none', FLOAT_POS[floatPosition] || FLOAT_POS.br)}>
      <div className="relative pointer-events-auto">
        {/* Toggle button */}
        <motion.button
          type="button"
          onClick={() => setOpen(v => !v)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={open ? 'Đóng hướng dẫn' : 'Mở hướng dẫn'}
          className="relative w-11 h-11 rounded-full flex items-center justify-center shadow-lg overflow-hidden group"
          style={{
            background: `linear-gradient(135deg, ${accent.color}, rgba(${accentRgb},0.7))`,
            boxShadow: `0 6px 20px -4px rgba(${accentRgb},0.55), 0 0 0 1px rgba(${accentRgb},0.4)`,
          }}
        >
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 0 0 rgba(${accentRgb},0.55)`,
              animation: 'ringPulse 2.4s ease-out infinite',
            }}
          />
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <X size={20} className="text-white drop-shadow" />
              </motion.span>
            ) : (
              <motion.span
                key="?"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <HelpCircle size={20} className="text-white drop-shadow" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Step counter pill */}
        {!open && stepCount > 0 && (
          <span
            className="absolute -top-1 -right-1 px-1.5 h-4 min-w-[16px] rounded-full text-[9px] font-bold flex items-center justify-center pointer-events-none"
            style={{
              background: '#0c0c14',
              color: accent.color,
              border: `1px solid rgba(${accentRgb},0.6)`,
            }}
          >
            {stepCount}
          </span>
        )}

        {/* Popover */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="popover"
              initial={{ opacity: 0, scale: 0.94, y: isBottom ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: isBottom ? 8 : -8 }}
              transition={{ duration: 0.22, ease: [0.22, 0.8, 0.22, 1] }}
              className={clsx(
                'rounded-2xl overflow-hidden flex flex-col',
                popoverPosClasses,
              )}
              style={{
                width: 'min(380px, calc(100vw - 32px))',
                maxHeight: 'min(560px, calc(100vh - 88px))',
                background: 'rgba(14,14,24,0.96)',
                border: `1px solid rgba(${accentRgb},0.3)`,
                backdropFilter: 'blur(24px) saturate(180%)',
                boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(${accentRgb},0.15)`,
              }}
            >
              {/* Top accent line */}
              <div
                className="h-0.5 flex-shrink-0"
                style={{ background: `linear-gradient(90deg, ${accent.color}, rgba(${accentRgb},0.4))` }}
              />

              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `rgba(${accentRgb},0.16)`,
                    border: `1px solid rgba(${accentRgb},0.3)`,
                  }}
                >
                  <HeaderIcon size={16} style={{ color: accent.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-display font-semibold text-white text-sm leading-tight">
                      {title}
                    </h3>
                    {finalBadge && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                        style={{
                          background: `rgba(${accentRgb},0.18)`,
                          color: accent.color,
                          border: `1px solid rgba(${accentRgb},0.35)`,
                        }}
                      >
                        {finalBadge}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-[10px] text-white/40 mt-0.5 leading-snug line-clamp-2">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] flex-shrink-0 transition-colors"
                  aria-label="Đóng"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body (scrollable) */}
              <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                <Body
                  steps={steps}
                  tips={tips}
                  active={active}
                  setActive={setActive}
                  accent={accent}
                  accentRgb={accentRgb}
                />
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t flex items-center justify-between gap-2 flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-[10px] text-white/30">
                  Phím tắt: <kbd className="px-1 py-0.5 rounded font-mono text-white/55"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>?</kbd>
                </span>
                <span className="text-[10px] text-white/30">
                  ESC để đóng
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  return createPortal(ui, target)
}

/* ─── Stepper subcomponent ───────────────────────────────────────────────── */
function Stepper({ steps, active, onActive, accent, accentRgb }) {
  return (
    <div className="relative">
      {/* Track */}
      <div
        className="absolute left-0 right-0 top-4 h-0.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      />
      {/* Progress line */}
      <motion.div
        className="absolute left-0 top-4 h-0.5 rounded-full"
        style={{ background: `linear-gradient(90deg, ${accent.color}, rgba(${accentRgb},0.45))` }}
        initial={false}
        animate={{
          width: steps.length <= 1
            ? '0%'
            : `${(active / (steps.length - 1)) * 100}%`,
        }}
        transition={{ duration: 0.4, ease: [0.22, 0.8, 0.22, 1] }}
      />

      <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((s, i) => {
          const isActive = i === active
          const isDone = i < active
          return (
            <button
              key={i}
              type="button"
              onClick={() => onActive(i)}
              className="group relative flex flex-col items-center gap-1.5 px-1 outline-none"
            >
              <span
                className={clsx(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300',
                  isActive ? 'scale-110' : 'group-hover:scale-105',
                )}
                style={{
                  background: isActive || isDone
                    ? `linear-gradient(135deg, ${accent.color}, rgba(${accentRgb},0.7))`
                    : 'rgba(255,255,255,0.05)',
                  border: isActive
                    ? `2px solid ${accent.color}`
                    : isDone
                    ? `1px solid rgba(${accentRgb},0.6)`
                    : '1px solid rgba(255,255,255,0.1)',
                  color: isActive || isDone ? '#0c0c14' : 'rgba(255,255,255,0.5)',
                  boxShadow: isActive
                    ? `0 0 0 4px rgba(${accentRgb},0.18), 0 4px 14px -4px rgba(${accentRgb},0.7)`
                    : isDone
                    ? `0 0 10px -2px rgba(${accentRgb},0.5)`
                    : 'none',
                }}
              >
                {isDone ? (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={clsx(
                  'text-[10px] leading-tight text-center transition-colors line-clamp-2',
                  isActive
                    ? 'font-semibold text-white'
                    : isDone
                    ? 'text-white/55'
                    : 'text-white/35 group-hover:text-white/65',
                )}
                style={{ maxWidth: '100%' }}
              >
                {s.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
