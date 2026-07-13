// ==================== USER ====================
export interface User {
  id: string
  name: string
  phone: string
  email?: string
  lineUid?: string
  avatarUrl?: string
  role?: 'user' | 'admin'
  createdAt: Date
}

// ==================== COMMUNITY ====================
export type CommunityPlan = 'free' | 'community' | 'pro'

export interface Community {
  id: string
  name: string
  province: string
  district: string
  subdistrict: string
  slug: string
  description?: string
  logoUrl?: string
  bannerUrl?: string
  plan: CommunityPlan
  memberCount: number
  isVerified: boolean
  createdAt: Date
}

export type MemberRole = 'admin' | 'seller' | 'member'

export interface CommunityMember {
  id: string
  communityId: string
  userId: string
  role: MemberRole
  joinedAt: Date
}

// ==================== SHOP ====================
export interface Shop {
  id: string
  communityId: string
  ownerId: string
  name: string
  description?: string
  bannerUrl?: string
  isActive: boolean
  createdAt: Date
}

// ==================== PRODUCT ====================
export type ProductStatus = 'active' | 'inactive' | 'out_of_stock'

export interface Product {
  id: string
  shopId: string
  name: string
  description?: string
  price: number
  stock: number
  images: string[]
  category: string
  status: ProductStatus
  qrCode?: string
  createdAt: Date
  updatedAt: Date
}

export interface ProductWithShop extends Product {
  shop: Shop & { community: Community }
}

// ==================== ORDER ====================
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: string
  buyerId: string
  shopId: string
  status: OrderStatus
  total: number
  deliveryAddress: Address
  trackingNumber?: string
  logisticsProvider?: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string  // snapshot at time of order
  qty: number
  priceSnapshot: number
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
  buyer: User
  shop: Shop
}

// ==================== PAYMENT ====================
export type PaymentMethod = 'promptpay' | 'qr_code' | 'bank_transfer' | 'credit_card'
export type PaymentStatus = 'pending' | 'verifying' | 'verified' | 'failed' | 'refunded'

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  reference?: string
  slipUrl?: string
  verifiedAt?: Date
  createdAt: Date
}

// ==================== CHAT ====================
export type MessageType = 'text' | 'image' | 'order_ref'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: MessageType
  readAt?: Date | null
  createdAt: Date
}

export interface Conversation {
  id: string
  buyerId: string
  sellerId: string
  orderId?: string
  lastMessage?: Message
  updatedAt: Date
}

// ==================== COMMON ====================
export interface Address {
  name: string
  phone: string
  address: string
  district: string
  province: string
  zipCode: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
