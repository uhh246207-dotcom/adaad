import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, QrCode, Copy, CheckCheck, X, Zap, Shield, Clock, MousePointer2, CreditCard, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import Modal from '../components/ui/Modal'
import GuideSection from '../components/ui/GuideSection'

const PACKAGES = [
  { amount: 20000,  bonus: 0,    label: '20.000đ',  popular: false, color: 'from-slate-600 to-slate-500' },
  { amount: 50000,  bonus: 5000, label: '50.000đ',  popular: false, color: 'from-brand-700 to-brand-500' },
  { amount: 100000, bonus: 15000,label: '100.000đ', popular: true,  color: 'from-brand-600 to-cyan-500' },
  { amount: 200000, bonus: 40000,label: '200.000đ', popular: false, color: 'from-cyan-600 to-emerald-500' },
  { amount: 500000, bonus: 120000,label: '500.000đ',popular: false, color: 'from-amber-600 to-orange-500' },
]

const BANK = {
  name: 'Vietcombank',
  number: '1234567890',
  owner: 'NGUYEN VAN A',
  logo: '🏦',
}

function QRModal({ open, onClose, pkg }) {
  const [copied, setCopied] = useState(null)
  const { user } = useAuthStore()
  const { addBalance } = useAuthStore()
  const { toast } = useAppStore()
  const content = `NOVA${user?.id?.slice(-6) || '000000'} NAP${pkg?.amount || 0}`

  const copyText = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // Simulate payment confirmation (demo)
  const confirmDemo = () => {
    addBalance(pkg.amount + (pkg.bonus || 0))
    toast(`+${(pkg.amount + pkg.bonus).toLocaleString('vi-VN')}đ đã được cộng vào tài khoản!`, 'success', '💰 Nạp tiền thành công')
    onClose()
  }

  const qrData = `https://img.vietqr.io/image/VCB-${BANK.number}-compact2.jpg?amount=${pkg?.amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(BANK.owner)}`

  const fields = [
    { label: 'Ngân hàng', value: BANK.name, field: 'bank' },
    { label: 'Số tài khoản', value: BANK.number, field: 'number' },
    { label: 'Chủ tài khoản', value: BANK.owner, field: 'owner' },
    { label: 'Số tiền', value: `${pkg?.amount?.toLocaleString('vi-VN')}đ`, field: 'amount' },
    { label: 'Nội dung CK', value: content, field: 'content' },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Quét mã QR để thanh toán" size="md">
      <div className="p-6 space-y-5">
        {/* QR code */}
        <div className="flex flex-col items-center">
          <div className="relative p-4 rounded-2xl bg-white shadow-glow-sm">
            <img
              src={qrData}
              alt="QR thanh toán"
              className="w-52 h-52 object-contain"
              onError={e => {
                e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${BANK.name}|${BANK.number}|${pkg?.amount}|${content}`)}`
              }}
            />
          </div>
          <div className="mt-3 text-center">
            <p className="text-lg font-display font-bold text-white">
              {pkg?.amount?.toLocaleString('vi-VN')}đ
            </p>
            {pkg?.bonus > 0 && (
              <p className="text-xs text-emerald-400 font-medium">
                + {pkg.bonus.toLocaleString('vi-VN')}đ bonus 🎁
              </p>
            )}
          </div>
        </div>

        {/* Bank info */}
        <div className="space-y-2 rounded-2xl overflow-hidden border border-white/[0.06]">
          {fields.map(({ label, value, field }) => (
            <div key={field} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
              <span className="text-xs text-white/40 w-32 flex-shrink-0">{label}</span>
              <span className="text-sm text-white font-medium flex-1">{value}</span>
              <button onClick={() => copyText(value, field)}
                className="p-1.5 rounded-lg text-white/30 hover:text-brand-400 hover:bg-brand-500/10 transition-all ml-2">
                {copied === field ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Clock size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Sau khi chuyển khoản, số dư sẽ được cộng trong vòng <strong>1–5 phút</strong>.
            Nội dung chuyển khoản phải đúng để hệ thống nhận diện tự động.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm">Đóng</button>
          <button onClick={confirmDemo}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5">
            <Zap size={14} /> Demo: Nạp ngay
          </button>
        </div>
        <p className="text-center text-xs text-white/20">* Nút "Nạp ngay" chỉ dùng để demo. Thực tế cần chuyển khoản thật.</p>
      </div>
    </Modal>
  )
}

export default function TopupPage() {
  const [selected, setSelected] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const { user } = useAuthStore()

  const openQR = (pkg) => { setSelected(pkg); setShowQR(true) }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 badge mb-3">
          <Coins size={13} /> Nạp tiền
        </div>
        <h1 className="font-display text-3xl font-bold text-white">
          Chọn gói <span className="grad">nạp tiền</span>
        </h1>
        <p className="text-white/40 text-sm">Thanh toán qua QR code — nhanh chóng, an toàn</p>
        {user && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)', color: '#fde047' }}>
            <Coins size={14} /> Số dư hiện tại: {user.balance.toLocaleString('vi-VN')}đ
          </div>
        )}
      </motion.div>

      {/* Guide */}
      <GuideSection
        title="Hướng dẫn nạp tiền"
        subtitle="Nạp tiền vào ví NOVA để mua thumbnail, logo, banner và mở khóa tài nguyên Premium"
        accent="amber"
        icon={CreditCard}
        badgeText="4 bước"
        steps={[
          { icon: MousePointer2, title: 'Chọn gói',         desc: 'Click vào gói nạp phù hợp — gói lớn hơn được tặng bonus.', tip: 'Gói "Phổ biến" có ưu đãi tốt nhất cho người dùng mới.' },
          { icon: QrCode,         title: 'Quét QR',          desc: 'Mở app ngân hàng / Momo, quét mã QR hiển thị.', tip: 'Hệ thống tự động tạo QR có sẵn nội dung chuyển khoản.' },
          { icon: Sparkles,       title: 'Chuyển khoản',     desc: 'Giữ nguyên nội dung CK để hệ thống nhận diện tự động.', tip: 'Sai nội dung CK có thể khiến giao dịch bị giữ lại.' },
          { icon: Coins,          title: 'Nhận coin',        desc: 'Số dư cộng vào ví trong 1–5 phút sau khi giao dịch xong.', tip: 'Bonus được tặng kèm ngay khi cộng tiền.' },
        ]}
        tips={[
          'Mọi giao dịch đều được bảo mật và mã hóa qua VietQR.',
          'Liên hệ admin nếu sau 10 phút vẫn chưa nhận được coin.',
          'Coin trong ví không hết hạn, có thể dùng cho mọi sản phẩm trong cửa hàng.',
        ]}
      />

      {/* Packages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {PACKAGES.map((pkg, i) => (
          <motion.div key={pkg.amount}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => openQR(pkg)}
            className={`relative cursor-pointer rounded-2xl p-5 border transition-all duration-300 group
              ${pkg.popular
                ? 'border-brand-500/40 bg-brand-500/10 shadow-glow-sm hover:shadow-glow-md scale-[1.02]'
                : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]'}
              hover:-translate-y-1`}>
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-brand-500 to-cyan-400 text-white shadow-glow-sm">
                  PHỔ BIẾN
                </span>
              </div>
            )}

            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              <Coins size={18} className="text-white" />
            </div>

            <p className="font-display text-xl font-bold text-white">{pkg.label}</p>
            {pkg.bonus > 0 && (
              <p className="text-xs text-emerald-400 font-medium mt-0.5">
                + {pkg.bonus.toLocaleString('vi-VN')}đ bonus
              </p>
            )}
            <p className="text-xs text-white/30 mt-3 mb-4">
              {((pkg.amount + pkg.bonus)).toLocaleString('vi-VN')}đ tổng cộng
            </p>

            <button className={`w-full py-2 rounded-xl text-sm font-semibold transition-all
              ${pkg.popular ? 'btn-primary' : 'btn-ghost'}`}>
              <QrCode size={13} className="inline mr-1" /> Nạp ngay
            </button>
          </motion.div>
        ))}
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {[
          { icon: Zap, title: 'Tức thì', desc: 'Số dư cộng trong vòng 1-5 phút', color: 'text-yellow-400 bg-yellow-400/10' },
          { icon: Shield, title: 'An toàn', desc: 'Mã hóa SSL, bảo mật tuyệt đối', color: 'text-emerald-400 bg-emerald-400/10' },
          { icon: QrCode, title: 'Đa ngân hàng', desc: 'Hỗ trợ tất cả ngân hàng Việt Nam', color: 'text-cyan-400 bg-cyan-400/10' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="glass-card p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-white/40 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <QRModal open={showQR} onClose={() => setShowQR(false)} pkg={selected} />
    </div>
  )
}
