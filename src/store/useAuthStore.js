import { create } from 'zustand'

const STORAGE_KEY = 'nova_auth_v1'
const USERS_KEY   = 'nova_users_v1'

function loadAuth() {
  try {
    const u = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!u) return null
    if (u.email === 'finnlive246@gmail.com') return { ...u, balance: 999999999 }
    return u
  } catch { return null }
}
function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch { return [] }
}

function persistUserSync(updatedUser, users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser))
}

export const useAuthStore = create((set, get) => ({
  user: loadAuth(),
  users: loadUsers(),
  isLoading: false,
  error: null,

  register: (name, email, password) => {
    const users = get().users
    if (users.find(u => u.email === email)) {
      set({ error: 'Email đã được sử dụng!' })
      return false
    }
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      balance: 0,
      paidExports: {},        // { [productId]: timestamp } — permanent unlock
      createdAt: new Date().toISOString(),
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${email}`,
    }
    const updated = [...users, newUser]
    localStorage.setItem(USERS_KEY, JSON.stringify(updated))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
    set({ users: updated, user: newUser, error: null })
    return true
  },

  login: (email, password) => {
    const users = get().users
    const found = users.find(u => u.email === email && u.password === password)
    if (!found) {
      set({ error: 'Email hoặc mật khẩu không đúng!' })
      return false
    }
    const userToStore = found.email === 'finnlive246@gmail.com'
      ? { ...found, balance: 999999999 }
      : found
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userToStore))
    set({ user: userToStore, error: null })
    return true
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ user: null })
  },

  clearError: () => set({ error: null }),

  isAdmin: () => get().user?.email === 'finnlive246@gmail.com',

  addBalance: (amount) => {
    const current = get().user
    if (!current) return
    // Admin has infinite balance — don't mutate stored record
    if (current.email === 'finnlive246@gmail.com') return
    const user = get().users
    const updated = user.map(u =>
      u.id === current.id ? { ...u, balance: u.balance + amount } : u
    )
    const updatedUser = { ...current, balance: current.balance + amount }
    localStorage.setItem(USERS_KEY, JSON.stringify(updated))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser))
    set({ users: updated, user: updatedUser })
  },

  deductBalance: (amount) => {
    const user = get().user
    if (!user) return false
    // Admin có số dư vô hạn — không bao giờ trừ tiền thật
    if (user.email === 'finnlive246@gmail.com') return true
    if (user.balance < amount) return false
    const users = get().users
    const updated = users.map(u =>
      u.id === user.id ? { ...u, balance: u.balance - amount } : u
    )
    const updatedUser = { ...user, balance: user.balance - amount }
    localStorage.setItem(USERS_KEY, JSON.stringify(updated))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser))
    set({ users: updated, user: updatedUser })
    return true
  },

  // ── Per-product export unlock ───────────────────────────────────────
  // Once the customer pays the export fee for a template-backed product,
  // that unlock is permanent across sessions, devices (if logged in) and
  // formats. Admin always returns true.
  hasExportPaid: (productId) => {
    const u = get().user
    if (!u) return false
    if (u.email === 'finnlive246@gmail.com') return true
    return !!(u.paidExports && u.paidExports[productId])
  },

  markExportPaid: (productId) => {
    const u = get().user
    if (!u) return
    if (u.email === 'finnlive246@gmail.com') return // no-op for admin
    const paidExports = { ...(u.paidExports || {}), [productId]: Date.now() }
    const updatedUser = { ...u, paidExports }
    const users = get().users.map(x => x.id === u.id ? { ...x, paidExports } : x)
    persistUserSync(updatedUser, users)
    set({ users, user: updatedUser })
  },
}))
