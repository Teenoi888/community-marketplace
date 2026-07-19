import { create } from "zustand"
import { api } from "@/lib/api"

interface WishlistState {
  ids: Set<string>
  loaded: boolean
  load: () => Promise<void>
  add: (productId: string) => Promise<void>
  remove: (productId: string) => Promise<void>
  toggle: (productId: string) => Promise<void>
  has: (productId: string) => boolean
  reset: () => void
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  load: async () => {
    if (get().loaded) return
    try {
      const r = await api.get("/wishlist/ids")
      set({ ids: new Set(r.data.data || []), loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  add: async (productId: string) => {
    set(s => ({ ids: new Set([...s.ids, productId]) }))
    try {
      await api.post(`/wishlist/${productId}`, {})
    } catch {
      // revert on error
      set(s => { const n = new Set(s.ids); n.delete(productId); return { ids: n } })
    }
  },

  remove: async (productId: string) => {
    set(s => { const n = new Set(s.ids); n.delete(productId); return { ids: n } })
    try {
      await api.delete(`/wishlist/${productId}`)
    } catch {
      // revert on error
      set(s => ({ ids: new Set([...s.ids, productId]) }))
    }
  },

  toggle: async (productId: string) => {
    const { has, add, remove } = get()
    if (has(productId)) await remove(productId)
    else await add(productId)
  },

  has: (productId: string) => get().ids.has(productId),

  reset: () => set({ ids: new Set(), loaded: false }),
}))
