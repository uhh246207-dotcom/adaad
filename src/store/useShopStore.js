import { create } from 'zustand'

const SHOP_KEY = 'nova_shop_products_v1'

function loadProducts() {
  try { return JSON.parse(localStorage.getItem(SHOP_KEY)) || [] } catch { return [] }
}

// In-memory map for PSD ArrayBuffers (too large for localStorage)
export const psdDataMap = new Map()

export const useShopStore = create((set, get) => ({
  products: loadProducts(),

  addProduct: (product) => {
    const newProduct = {
      ...product,
      id: Math.random().toString(36).slice(2, 10),
      sold: product.sold ?? 0,
      createdAt: product.createdAt ?? new Date().toISOString(),
    }
    const updated = [...get().products, newProduct]
    try {
      localStorage.setItem(SHOP_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('nova_shop: localStorage quota exceeded, product stored in memory only.', e)
    }
    set({ products: updated })
    return newProduct
  },

  updateProduct: (id, changes) => {
    const updated = get().products.map(p => p.id === id ? { ...p, ...changes } : p)
    try { localStorage.setItem(SHOP_KEY, JSON.stringify(updated)) } catch (e) { console.warn('nova_shop: localStorage quota exceeded', e) }
    set({ products: updated })
  },

  deleteProduct: (id) => {
    const updated = get().products.filter(p => p.id !== id)
    try { localStorage.setItem(SHOP_KEY, JSON.stringify(updated)) } catch (e) { console.warn('nova_shop: localStorage quota exceeded', e) }
    set({ products: updated })
    psdDataMap.delete(id)
  },

  getProduct: (id) => get().products.find(p => p.id === id) || null,
}))
