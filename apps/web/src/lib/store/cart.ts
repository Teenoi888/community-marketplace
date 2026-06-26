import { create } from "zustand"
import type { Product } from "@cm/types"

interface CartItem {
  product: Product
  quantity: number
  shopId: string
  shopName: string
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product, shopId: string, shopName: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product, shopId, shopName) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
              : i
          ),
        }
      }
      return { items: [...state.items, { product, quantity: 1, shopId, shopName }] }
    })
  },

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.product.id !== productId)
          : state.items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    })),

  clearCart: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
