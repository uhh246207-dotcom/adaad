import { create } from 'zustand'

const CHAT_KEY = 'nova_chat_v1'

function loadMessages() {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || [] } catch { return [] }
}

export const useChatStore = create((set, get) => ({
  messages: loadMessages(),
  isOpen: false,
  unread: 0,

  sendMessage: (user, text, isAdmin = false) => {
    if (!text.trim() || !user) return
    const msg = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isAdmin,
    }
    const updated = [...get().messages, msg].slice(-200)
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(updated)) } catch {}
    set(s => ({ messages: updated, unread: s.isOpen ? 0 : s.unread + 1 }))
  },

  deleteMessage: (id) => {
    const updated = get().messages.filter(m => m.id !== id)
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(updated)) } catch {}
    set({ messages: updated })
  },

  sendSystemMessage: (text) => {
    const msg = {
      id: Date.now().toString(),
      userId: 'system',
      userName: 'NOVA System',
      userAvatar: null,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isAdmin: true,
      isSystem: true,
    }
    const updated = [...get().messages, msg].slice(-200)
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(updated)) } catch {}
    set(s => ({ messages: updated, unread: s.isOpen ? 0 : s.unread + 1 }))
  },

  openChat: () => set({ isOpen: true, unread: 0 }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set(s => ({ isOpen: !s.isOpen, unread: s.isOpen ? s.unread : 0 })),
  clearUnread: () => set({ unread: 0 }),
}))
