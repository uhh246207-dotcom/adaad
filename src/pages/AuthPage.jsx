import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'

function InputField({ icon: Icon, label, type = 'text', value, onChange, placeholder, error, rightEl }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
          <Icon size={15} />
        </div>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full pl-10 pr-${rightEl ? '10' : '4'} py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all
            ${error ? 'border-rose-500/50 bg-rose-500/5' : 'bg-white/[0.04] border-white/[0.08] focus:border-brand-500/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(110,75,255,0.15)]'}
            border`}
        />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs text-rose-400">{error}</motion.p>
      )}
    </div>
  )
}

function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const { login, error, clearError } = useAuthStore()
  const { toast } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => { clearError() }, [])

  const validate = () => {
    const e = {}
    if (!email) e.email = 'Vui lòng nhập email'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email không hợp lệ'
    if (!password) e.password = 'Vui lòng nhập mật khẩu'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const ok = login(email, password)
    if (ok) {
      toast('Chào mừng trở lại! 👋', 'success', 'Đăng nhập thành công')
      navigate('/')
    }
  }

  return (
    <motion.form onSubmit={submit} className="space-y-5"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <InputField icon={Mail} label="Email" type="email" value={email}
        onChange={e => setEmail(e.target.value)} placeholder="you@example.com" error={errors.email} />
      <InputField icon={Lock} label="Mật khẩu" type={showPass ? 'text' : 'password'} value={password}
        onChange={e => setPassword(e.target.value)} placeholder="••••••••" error={errors.password}
        rightEl={
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="text-white/30 hover:text-white/60 transition-colors">
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        } />

      {error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20">
          <span>⚠️</span>{error}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div onClick={() => setRemember(!remember)}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-all
              ${remember ? 'bg-brand-500 border-brand-500' : 'border-white/20 hover:border-white/40'}`}>
            {remember && <CheckCircle size={12} className="text-white" />}
          </div>
          <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">Nhớ tài khoản</span>
        </label>
        <button type="button" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          Quên mật khẩu?
        </button>
      </div>

      <button type="submit"
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-semibold">
        Đăng nhập <ArrowRight size={15} />
      </button>

      <p className="text-center text-sm text-white/40">
        Chưa có tài khoản?{' '}
        <button type="button" onClick={onSwitch} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Đăng ký ngay
        </button>
      </p>
    </motion.form>
  )
}

function RegisterForm({ onSwitch }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const { register, error, clearError } = useAuthStore()
  const { toast } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => { clearError() }, [])

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Vui lòng nhập tên'
    if (!email) e.email = 'Vui lòng nhập email'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email không hợp lệ'
    if (!password) e.password = 'Vui lòng nhập mật khẩu'
    else if (password.length < 6) e.password = 'Mật khẩu ít nhất 6 ký tự'
    if (password !== confirm) e.confirm = 'Mật khẩu không khớp'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const ok = register(name.trim(), email, password)
    if (ok) {
      toast('Tài khoản đã được tạo thành công! 🎉', 'success', 'Chào mừng bạn đến NOVA')
      navigate('/')
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthColors = ['', 'bg-rose-500', 'bg-amber-400', 'bg-emerald-400']
  const strengthLabels = ['', 'Yếu', 'Trung bình', 'Mạnh']

  return (
    <motion.form onSubmit={submit} className="space-y-4"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <InputField icon={User} label="Tên hiển thị" value={name}
        onChange={e => setName(e.target.value)} placeholder="Nguyen Van A" error={errors.name} />
      <InputField icon={Mail} label="Email" type="email" value={email}
        onChange={e => setEmail(e.target.value)} placeholder="you@example.com" error={errors.email} />
      <div className="space-y-1.5">
        <InputField icon={Lock} label="Mật khẩu" type={showPass ? 'text' : 'password'} value={password}
          onChange={e => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" error={errors.password}
          rightEl={
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="text-white/30 hover:text-white/60 transition-colors">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          } />
        {password && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-1 flex-1">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                  ${strength >= i ? strengthColors[strength] : 'bg-white/10'}`} />
              ))}
            </div>
            <span className={`text-xs font-medium ${strength === 1 ? 'text-rose-400' : strength === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {strengthLabels[strength]}
            </span>
          </div>
        )}
      </div>
      <InputField icon={Lock} label="Xác nhận mật khẩu" type="password" value={confirm}
        onChange={e => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" error={errors.confirm} />

      {error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20">
          <span>⚠️</span>{error}
        </motion.div>
      )}

      <button type="submit"
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-semibold">
        Tạo tài khoản <ArrowRight size={15} />
      </button>

      <p className="text-center text-sm text-white/40">
        Đã có tài khoản?{' '}
        <button type="button" onClick={onSwitch} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Đăng nhập
        </button>
      </p>
    </motion.form>
  )
}

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login')
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/') }, [user])

  const FEATURES = [
    '✦ Thiết kế AI chuyên nghiệp',
    '⚡ Xóa nền tự động tức thì',
    '🎁 Voucher & quà tặng hàng ngày',
    '📦 Kho tài nguyên premium 10,000+',
  ]

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0a0a12' }}>
      {/* BG blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob w-[700px] h-[700px] bg-brand-600" style={{ top: '-20%', left: '-15%', opacity: 0.2 }} />
        <div className="blob w-[500px] h-[500px] bg-cyan-600" style={{ bottom: '-15%', right: '-10%', opacity: 0.15 }} />
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)`,
          backgroundSize: '56px 56px',
        }} />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 relative z-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 flex items-center justify-center shadow-glow-md">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-xl">NOVA</p>
            <p className="text-[10px] text-white/40 tracking-widest uppercase">AI Studio</p>
          </div>
        </Link>

        <div className="space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
              Nền tảng thiết kế<br />
              <span className="grad">AI thế hệ mới</span>
            </h2>
            <p className="text-white/50 text-base leading-relaxed">
              Tạo ra những thiết kế đẳng cấp với sức mạnh của trí tuệ nhân tạo.
              Nhanh hơn. Đẹp hơn. Chuyên nghiệp hơn.
            </p>
          </div>
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                className="flex items-center gap-3 text-sm text-white/60">
                {f}
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20">© 2026 NOVA AI Studio. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.8, 0.22, 1] }}
          className="w-full max-w-md">

          {/* Card */}
          <div className="rounded-3xl overflow-hidden shadow-glass-lg"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(40px)',
            }}>
            {/* Top rim */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {[['login','Đăng nhập'],['register','Đăng ký']].map(([v,label]) => (
                <button key={v} onClick={() => setTab(v)}
                  className={`flex-1 py-4 text-sm font-semibold transition-all relative ${tab === v ? 'text-white' : 'text-white/40 hover:text-white/60'}`}>
                  {label}
                  {tab === v && (
                    <motion.div layoutId="auth-tab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 to-cyan-400"
                      transition={{ type: 'spring', bounce: 0.2 }} />
                  )}
                </button>
              ))}
            </div>

            <div className="p-7">
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white">
                  {tab === 'login' ? 'Chào mừng trở lại 👋' : 'Tạo tài khoản mới ✨'}
                </h3>
                <p className="text-sm text-white/40 mt-1">
                  {tab === 'login' ? 'Đăng nhập để tiếp tục sử dụng NOVA AI' : 'Miễn phí 100% — không cần thẻ tín dụng'}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {tab === 'login'
                  ? <LoginForm key="login" onSwitch={() => setTab('register')} />
                  : <RegisterForm key="register" onSwitch={() => setTab('login')} />
                }
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
