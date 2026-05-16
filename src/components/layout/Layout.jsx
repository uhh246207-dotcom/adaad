import { useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ToastContainer from '../ui/ToastContainer'
import ChatWidget from '../ui/ChatWidget'

/* Animated background blobs (parallax-ish floating orbs) */
function BgBlobs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Floating orbs */}
      <div className="blob blob-anim-1 w-[640px] h-[640px] bg-brand-600"
        style={{ top: '-15%', left: '-10%' }} />
      <div className="blob blob-anim-2 w-[520px] h-[520px] bg-cyan-600"
        style={{ bottom: '-12%', right: '-8%', opacity: 0.16 }} />
      <div className="blob blob-anim-3 w-[400px] h-[400px] bg-pink-600"
        style={{ top: '38%', left: '38%', opacity: 0.11 }} />
      <div className="blob blob-anim-1 w-[360px] h-[360px] bg-emerald-600"
        style={{ bottom: '15%', left: '6%', opacity: 0.10, animationDelay: '4s' }} />

      {/* Aurora soft overlay */}
      <div className="aurora opacity-60" />

      {/* Grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)',
      }} />

      {/* Subtle vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 90% 60% at 50% 0%, transparent 60%, rgba(0,0,0,0.45) 100%)' }} />
    </div>
  )
}

/* Decorative twinkling sparkles scattered across the screen */
function SparkleField({ count = 24 }) {
  const sparkles = useMemo(() => {
    // Deterministic positions so they don't shift every render
    const arr = []
    for (let i = 0; i < count; i++) {
      const r = (n) => {
        // simple LCG for stable pseudo-random
        const x = Math.sin(i * 9301 + n * 49297) * 233280
        return x - Math.floor(x)
      }
      arr.push({
        top:   `${r(1) * 100}%`,
        left:  `${r(2) * 100}%`,
        size:  2 + Math.floor(r(3) * 3),       // 2..4
        delay: r(4) * 4,
        dur:   3 + r(5) * 4,                   // 3..7s
        opacity: 0.35 + r(6) * 0.5,            // 0.35..0.85
      })
    }
    return arr
  }, [count])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {sparkles.map((s, i) => (
        <span
          key={i}
          className="sparkle"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen relative">
      <BgBlobs />
      <SparkleField count={28} />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Topbar />
        <main className="flex-1 overflow-auto">
          {/* keyed wrapper triggers a tiny fade-in on route change */}
          <div
            key={location.pathname}
            className="max-w-7xl mx-auto px-4 sm:px-6 py-6 anim-pop"
            style={{ animationDuration: '0.5s' }}
          >
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
      <ChatWidget />
    </div>
  )
}
