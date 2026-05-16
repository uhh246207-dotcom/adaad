import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader, Sparkles } from 'lucide-react'
import Layout from './components/layout/Layout'
import { useAuthStore } from './store/useAuthStore'

// ── Eagerly bundled (small, hit on every navigation) ────────────────────
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import ShopPage from './pages/ShopPage'
import GiftPage from './pages/GiftPage'
import ResourcesPage from './pages/ResourcesPage'
import IntroPage from './pages/IntroPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import SourcePage from './pages/SourcePage'
import DownloadsPage from './pages/DownloadsPage'
import TopupPage from './pages/TopupPage'

// ── Code-split (heavy / rarely visited) ─────────────────────────────────
// Each chunk gets its own JS bundle so the initial page load stays small.
// Wrapped in Suspense below.
const RemoveBgPage     = lazy(() => import('./pages/RemoveBgPage'))
const PsdAdminPage     = lazy(() => import('./pages/PsdAdminPage'))
const PsdCustomerPage  = lazy(() => import('./pages/PsdCustomerPage'))

function ProtectedRoute({ children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/auth" replace />
  return children
}

/* Lightweight branded fallback shown while a chunk is loading. */
function PageFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(110,75,255,0.18), rgba(77,208,255,0.12))',
            border: '1px solid rgba(110,75,255,0.3)',
          }}>
          <Sparkles size={24} className="text-brand-300" />
        </div>
        <Loader size={14} className="absolute -bottom-1 -right-1 text-brand-400 animate-spin" />
      </div>
      <p className="text-sm text-white/45">Đang tải trang…</p>
    </div>
  )
}

const lazy_ = (Component) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
)

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/gift" element={<GiftPage />} />
        <Route path="/remove-bg" element={lazy_(RemoveBgPage)} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/topup" element={<ProtectedRoute><TopupPage /></ProtectedRoute>} />
        <Route path="/intro" element={<IntroPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/source" element={<SourcePage />} />
        <Route path="/downloads" element={<ProtectedRoute><DownloadsPage /></ProtectedRoute>} />
        <Route path="/admin/psd" element={<ProtectedRoute>{lazy_(PsdAdminPage)}</ProtectedRoute>} />
      </Route>
      <Route path="/psd/:productId" element={<ProtectedRoute>{lazy_(PsdCustomerPage)}</ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
