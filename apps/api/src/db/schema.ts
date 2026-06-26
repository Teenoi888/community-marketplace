import { pgTable, text, uuid, integer, numeric, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core"

// Enums
export const communityPlanEnum = pgEnum("community_plan", ["free", "community", "pro"])
export const memberRoleEnum = pgEnum("member_role", ["admin", "seller", "member"])
export const productStatusEnum = pgEnum("product_status", ["active", "inactive", "out_of_stock"])
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"
])
export const paymentMethodEnum = pgEnum("payment_method", ["promptpay", "qr_code", "bank_transfer", "credit_card"])
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "verifying", "verified", "failed", "refunded"])
export const messageTypeEnum = pgEnum("message_type", ["text", "image", "order_ref"])

// Tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  lineUid: text("line_uid").unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  province: text("province").notNull(),
  district: text("district").notNull(),
  subdistrict: text("subdistrict").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  plan: communityPlanEnum("plan").default("free").notNull(),
  memberCount: integer("member_count").default(0).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const communityMembers = pgTable("community_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: memberRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
})

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }).notNull(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  bannerUrl: text("banner_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  category: text("category").notNull(),
  status: productStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  shopId: uuid("shop_id").references(() => shops.id).notNull(),
  status: orderStatusEnum("status").default("pending_payment").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  deliveryAddress: jsonb("delivery_address").notNull(),
  trackingNumber: text("tracking_number"),
  logisticsProvider: text("logistics_provider"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull(),
  priceSnapshot: numeric("price_snapshot", { precision: 12, scale: 2 }).notNull(),
})

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  reference: text("reference"),
  slipUrl: text("slip_url"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: messageTypeEnum("type").default("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
