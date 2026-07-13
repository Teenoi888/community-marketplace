import { create } from "zustand"
import { persist } from "zustand/middleware"

interface CartItem {
  product: {
    id: string
    name: string
    price: number
    stock: number
    images: string[]
  }
  quantity: number
  shopId: string
  shopName: string
}

interface CartState {
  items: CartItem[]
  addItem: (product: CartItem["product"], shopId: string, shopName: string, qty?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, shopId, shopName, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + qty, product.stock) }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: Math.min(qty, product.stock), shopId, shopName }] }
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
    }),
    { name: "cm-cart" }
  )
)
