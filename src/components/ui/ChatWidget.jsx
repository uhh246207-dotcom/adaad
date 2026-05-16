import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Trash2, Bell } from 'lucide-react'
import { useChatStore } from '../../store/useChatStore'
import { useAuthStore } from '../../store/useAuthStore'

export default function ChatWidget() {
  const { messages, isOpen, unread, toggleChat, sendMessage, deleteMessage, sendSystemMessage } = useChatStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [sysInput, setSysInput] = useState('')
  const [showSysInput, setShowSysInput] = useState(false)
  const isAdmin = useAuthStore(s => s.isAdmin())
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(user, input, isAdmin)
      setInput('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSendSys = () => {
    if (sysInput.trim()) {
      sendSystemMessage(sysInput)
      setSysInput('')
      setShowSysInput(false)
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
        style={{ background: 'linear-gradient(135deg,#6e4bff,#4dd0ff)', boxShadow: '0 8px 32px rgba(110,75,255,0.4)' }}
      >
        <MessageCircle size={22} className="text-white" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 0.8, 0.22, 1] }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-3xl overflow-hidden flex flex-col"
            style={{
              height: 480,
              background: 'rgba(14,14,24,0.95)',
              border: '1px solid rgba(110,75,255,0.25)',
              backdropFilter: 'blur(32px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(110,75,255,0.15)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-white">NOVA Chat</span>
                <span className="text-xs text-white/30">{messages.length} tin</span>
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={() => setShowSysInput(s => !s)}
                    title="Gửi thông báo hệ thống"
                    className="p-1.5 rounded-lg text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                  >
                    <Bell size={14} />
                  </button>
                )}
                <button onClick={toggleChat} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* System message input (admin only) */}
            {isAdmin && showSysInput && (
              <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex gap-2">
                  <input
                    value={sysInput}
                    onChange={e => setSysInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendSys()}
                    placeholder="Nội dung thông báo hệ thống..."
                    className="flex-1 text-xs rounded-lg px-3 py-2 text-white outline-none"
                    style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}
                  />
                  <button onClick={handleSendSys} className="px-3 py-1.5 rounded-lg text-xs font-medium text-yellow-900" style={{ background: 'rgba(234,179,8,0.8)' }}>
                    Gửi
                  </button>
                </div>
              </div>
            )}

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-white/20">
                  <MessageCircle size={32} />
                  <p className="text-xs">Chưa có tin nhắn nào</p>
                </div>
              )}
              {messages.map(msg => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div
                        className="px-3 py-1.5 rounded-full text-xs text-yellow-300/90 text-center max-w-[85%]"
                        style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}
                      >
                        <Bell size={10} className="inline mr-1 -mt-0.5" />
                        {msg.text}
                      </div>
                    </div>
                  )
                }
                const isOwn = user && msg.userId === user.id
                return (
                  <div key={msg.id} className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.userAvatar && !isOwn && (
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName}
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0 mt-0.5"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    )}
                    <div className={`flex flex-col gap-0.5 max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5">
                        {!isOwn && <span className="text-[10px] text-white/40">{msg.userName}</span>}
                        {msg.isAdmin && (
                          <span
                            className="text-[8px] font-bold px-1 py-0.5 rounded"
                            style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)', color: '#fbbf24' }}
                          >
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-end gap-1">
                        {isAdmin && !isOwn && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-rose-400/50 hover:text-rose-400"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                        <div
                          className="px-3 py-2 rounded-2xl text-xs text-white/90 break-words"
                          style={isOwn
                            ? { background: 'linear-gradient(135deg,rgba(110,75,255,0.6),rgba(77,208,255,0.4))', border: '1px solid rgba(110,75,255,0.3)' }
                            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {msg.text}
                        </div>
                        {isAdmin && isOwn && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-rose-400/50 hover:text-rose-400"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {!user ? (
                <div className="text-center text-xs text-white/30 py-2">
                  Đăng nhập để chat
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 text-sm rounded-xl px-3 py-2.5 text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-all"
                    style={{ background: input.trim() ? 'linear-gradient(135deg,#6e4bff,#4dd0ff)' : 'rgba(255,255,255,0.06)' }}
                  >
                    <Send size={14} className={input.trim() ? 'text-white' : 'text-white/30'} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
