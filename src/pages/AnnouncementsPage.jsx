import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Plus, Trash2, Pin, Clock, Megaphone, AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'

const STORAGE_KEY = 'nova_announcements_v1'

function loadAnnouncements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveAnnouncements(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

const TYPES = [
  { value: 'info', label: 'Thông tin', icon: Info, color: '#4dd0ff', bg: 'rgba(77,208,255,0.1)', border: 'rgba(77,208,255,0.25)' },
  { value: 'success', label: 'Thành công', icon: CheckCircle, color: '#2bf2c0', bg: 'rgba(43,242,192,0.1)', border: 'rgba(43,242,192,0.25)' },
  { value: 'warning', label: 'Cảnh báo', icon: AlertCircle, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  { value: 'important', label: 'Quan trọng', icon: Megaphone, color: '#f472b6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)' },
]

function AnnouncementCard({ item, isAdmin, onDelete, onPin }) {
  const typeConfig = TYPES.find(t => t.value === item.type) || TYPES[0]
  const Icon = typeConfig.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="relative overflow-hidden rounded-2xl p-4 group"
      style={{ background: typeConfig.bg, border: `1px solid ${typeConfig.border}` }}
    >
      {item.pinned && (
        <div className="absolute top-2 right-2">
          <Pin size={11} className="text-yellow-400 fill-yellow-400" />
        </div>
      )}
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${typeConfig.color}22`, border: `1px solid ${typeConfig.color}40` }}>
          <Icon size={16} style={{ color: typeConfig.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}>
              {typeConfig.label}
            </span>
          </div>
          <p className="text-xs text-white/55 leading-relaxed mb-2">{item.content}</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Clock size={9} /> {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </span>
            {isAdmin && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onPin(item.id)}
                  className="p-1 rounded text-white/30 hover:text-yellow-400 transition-colors"
                  title={item.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}>
                  <Pin size={11} className={item.pinned ? 'fill-yellow-400 text-yellow-400' : ''} />
                </button>
                <button onClick={() => onDelete(item.id)}
                  className="p-1 rounded text-white/30 hover:text-rose-400 transition-colors" title="Xóa">
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function AnnouncementsPage() {
  const isAdmin = useAuthStore(s => s.isAdmin())
  const { toast } = useAppStore()
  const [announcements, setAnnouncements] = useState(loadAnnouncements)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', type: 'info', pinned: false })

  useEffect(() => { saveAnnouncements(announcements) }, [announcements])

  const addAnnouncement = () => {
    if (!form.title.trim() || !form.content.trim()) return
    const newItem = {
      id: Date.now().toString(),
      ...form,
      createdAt: new Date().toISOString(),
    }
    setAnnouncements(prev => [newItem, ...prev])
    setForm({ title: '', content: '', type: 'info', pinned: false })
    setShowForm(false)
    toast('Đã đăng thông báo mới', 'success', 'Thông báo')
  }

  const deleteAnnouncement = (id) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    toast('Đã xóa thông báo', 'success', 'Xóa')
  }

  const togglePin = (id) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a))
  }

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12,
    color: 'rgba(255,255,255,0.85)',
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    fontSize: 13,
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 badge mb-2">
            <Bell size={13} /> Thông báo
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Thông báo <span className="grad">hệ thống</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">Cập nhật, sự kiện và thông tin quan trọng từ NOVA</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: showForm ? 'rgba(239,68,68,0.12)' : 'rgba(110,75,255,0.15)',
              border: showForm ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(110,75,255,0.3)',
              color: showForm ? 'rgba(252,165,165,1)' : 'rgba(196,181,253,1)',
            }}>
            {showForm ? <><X size={13} /> Hủy</> : <><Plus size={13} /> Tạo thông báo</>}
          </button>
        )}
      </motion.div>

      {/* Admin form */}
      <AnimatePresence>
        {showForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-5 space-y-4">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Tiêu đề *</label>
                <input style={inputStyle} value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Tiêu đề thông báo..." />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Nội dung *</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Nội dung chi tiết..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Loại</label>
                  <select style={inputStyle} value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-xl"
                    style={{ background: form.pinned ? 'rgba(250,204,21,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="checkbox" checked={form.pinned}
                      onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                      className="sr-only" />
                    <Pin size={12} className={form.pinned ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'} />
                    <span className="text-xs text-white/60">{form.pinned ? 'Đã ghim' : 'Ghim lên đầu'}</span>
                  </label>
                </div>
              </div>
              <button onClick={addAnnouncement} disabled={!form.title.trim() || !form.content.trim()}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <Megaphone size={14} /> Đăng thông báo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements list */}
      <div className="space-y-3">
        <AnimatePresence>
          {sorted.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 text-white/30">
              <Bell size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có thông báo nào</p>
              {isAdmin && <p className="text-xs text-white/20 mt-1">Nhấn "Tạo thông báo" để bắt đầu</p>}
            </motion.div>
          ) : (
            sorted.map(item => (
              <AnnouncementCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onDelete={deleteAnnouncement}
                onPin={togglePin}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
