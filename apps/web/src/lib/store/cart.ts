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
  selectedIds: string[]
  addItem: (product: CartItem["product"], shopId: string, shopName: string, qty?: number) => void
  removeItem: (productId: string) => void
  removeItems: (productIds: string[]) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleItem: (productId: string) => void
  toggleShop: (shopId: string) => void
  isItemSelected: (productId: string) => boolean
  isShopSelected: (shopId: string) => boolean
  isShopPartiallySelected: (shopId: string) => boolean
  selectedItems: () => CartItem[]
  total: () => number
  selectedTotal: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedIds: [],

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
          return {
            items: [...state.items, { product, quantity: Math.min(qty, product.stock), shopId, shopName }],
            selectedIds: [...state.selectedIds, product.id],
          }
        })
      },

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
          selectedIds: state.selectedIds.filter((id) => id !== productId),
        })),

      removeItems: (productIds) =>
        set((state) => ({
          items: state.items.filter((i) => !productIds.includes(i.product.id)),
          selectedIds: state.selectedIds.filter((id) => !productIds.includes(id)),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
          selectedIds:
            quantity <= 0 ? state.selectedIds.filter((id) => id !== productId) : state.selectedIds,
        })),

      clearCart: () => set({ items: [], selectedIds: [] }),

      toggleItem: (productId) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(productId)
            ? state.selectedIds.filter((id) => id !== productId)
            : [...state.selectedIds, productId],
        })),

      toggleShop: (shopId) =>
        set((state) => {
          const shopItemIds = state.items.filter((i) => i.shopId === shopId).map((i) => i.product.id)
          const allSelected = shopItemIds.every((id) => state.selectedIds.includes(id))
          return {
            selectedIds: allSelected
              ? state.selectedIds.filter((id) => !shopItemIds.includes(id))
              : [...new Set([...state.selectedIds, ...shopItemIds])],
          }
        }),

      isItemSelected: (productId) => get().selectedIds.includes(productId),

      isShopSelected: (shopId) => {
        const shopItems = get().items.filter((i) => i.shopId === shopId)
        return shopItems.length > 0 && shopItems.every((i) => get().selectedIds.includes(i.product.id))
      },

      isShopPartiallySelected: (shopId) => {
        const shopItems = get().items.filter((i) => i.shopId === shopId)
        const selectedCount = shopItems.filter((i) => get().selectedIds.includes(i.product.id)).length
        return selectedCount > 0 && selectedCount < shopItems.length
      },

      selectedItems: () => get().items.filter((i) => get().selectedIds.includes(i.product.id)),
      total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      selectedTotal: () => get().selectedItems().reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "cm-cart" }
  )
)
