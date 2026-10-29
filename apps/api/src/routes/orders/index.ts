import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { orders, orderItems, payments, products, shops, users, coupons, couponRedemptions } from "../../db/schema.js"
import { and, eq, gte, sql } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"
import { notifyOrderStatus } from "../../lib/notify.js"
import { findValidCoupon } from "../coupons/index.js"
import { cancelOrder, newPaymentDeadline } from "../../lib/orders.js"
import postgres from "postgres"

const rawSql = postgres(process.env.DATABASE_URL!, { max: 1 })

// ── Who may change an order? ────────────────────────────────────────────────
// admin → ทุกสถานะ | เจ้าของร้าน → preparing/shipped/delivered/cancelled
// ผู้ซื้อ → ยืนยันรับสินค้า (shipped → delivered) เท่านั้น
// สถานะ "paid" ต้องมาจากระบบชำระเงิน (webhook) เท่านั้น ห้ามตั้งเองผ่าน endpoint นี้
async function getOrderRole(userId: string, orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order) return { order: null, role: null as null | "admin" | "seller" | "buyer" }
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (user?.role === "admin") return { order, role: "admin" as const }
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, order.shopId) })
  if (shop?.ownerId === userId) return { order, role: "seller" as const }
  if (order.buyerId === userId) return { order, role: "buyer" as const }
  return { order, role: null }
}
const SELLER_SETTABLE = ["preparing", "shipped", "delivered", "cancelled"]

async function sendLineNotify(token: string, message: string) {
  try {
    await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    })
  } catch (e) {
    console.warn("LINE Notify failed:", e)
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "รอชำระเงิน",
  paid: "ชำระแล้ว",
  preparing: "กำลังเตรียมสินค้า",
  shipped: "จัดส่งแล้ว",
  delivered: "ส่งถึงแล้ว",
  cancelled: "ยกเลิก",
}

const createOrderSchema = z.object({
  shopId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })),
  deliveryAddress: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    district: z.string(),
    subdistrict: z.string(),
    province: z.string(),
    zipCode: z.string(),
  }),
  couponCode: z.string().optional(),
})

export async function orderRoutes(app: FastifyInstance) {

  // Create order
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const body = createOrderSchema.parse(request.body)

    if (body.items.length === 0) return reply.code(400).send({ success: false, error: "ไม่มีสินค้าในออเดอร์" })

    // Everything that makes the order real happens in ONE transaction: stock reservation, coupon use,
    // the order and its items. If any step fails (e.g. the last unit was just taken), nothing is kept.
    class OrderError extends Error { constructor(public code: number, msg: string) { super(msg) } }
    let order: typeof orders.$inferSelect
    let total = 0
    const lineItems: { product: typeof products.$inferSelect; quantity: number; price: number }[] = []
    try {
      order = await db.transaction(async (tx) => {
        // Same product twice in the cart → one line, so the stock check below sees the real quantity.
        const wanted = new Map<string, number>()
        for (const item of body.items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity)

        for (const [productId, quantity] of wanted) {
          const [product] = await tx.select().from(products).where(eq(products.id, productId))
          if (!product) throw new OrderError(404, `ไม่พบสินค้า ${productId}`)
          if (product.shopId !== body.shopId) throw new OrderError(400, `สินค้า "${product.name}" ไม่ได้อยู่ในร้านนี้`)
          if (product.status !== "active") throw new OrderError(400, `สินค้า "${product.name}" ไม่พร้อมขาย`)
          // One conditional statement: take the stock only if it is still there. Two buyers racing for the
          // last unit can't both succeed, and stock can never go negative.
          const taken = await tx.update(products)
            .set({
              stock: sql`${products.stock} - ${quantity}`,
              status: sql`CASE WHEN ${products.stock} - ${quantity} = 0 THEN 'out_of_stock' ELSE ${products.status} END`,
              updatedAt: new Date(),
            })
            .where(and(eq(products.id, productId), gte(products.stock, quantity)))
            .returning({ id: products.id })
          if (taken.length === 0) throw new OrderError(400, `สินค้า "${product.name}" สต็อกไม่เพียงพอ`)
          const price = Number(product.price)
          total += price * quantity
          lineItems.push({ product, quantity, price })
        }

        // Coupon — validated server-side again (never trust the client's discount), then claimed
        // atomically so a usage limit can't be exceeded by concurrent orders.
        let discount = 0
        let appliedCoupon: typeof coupons.$inferSelect | null = null
        if (body.couponCode) {
          const result = await findValidCoupon(body.couponCode, body.shopId, total)
          if ("error" in result) throw new OrderError(400, result.error ?? "คูปองใช้ไม่ได้")
          discount = result.discount
          appliedCoupon = result.coupon
          const claimed = await tx.update(coupons)
            .set({ usedCount: sql`${coupons.usedCount} + 1` })
            .where(and(
              eq(coupons.id, appliedCoupon.id),
              sql`(${coupons.usageLimit} IS NULL OR ${coupons.usedCount} < ${coupons.usageLimit})`,
            ))
            .returning({ id: coupons.id })
          if (claimed.length === 0) throw new OrderError(400, "คูปองนี้ถูกใช้ครบจำนวนแล้ว")
        }

        const now = new Date()
        const [created] = await tx.insert(orders).values({
          buyerId: userId,
          shopId: body.shopId,
          total: (total - discount).toString(),
          deliveryAddress: body.deliveryAddress,
          status: "pending_payment",
          paymentExpiresAt: newPaymentDeadline(now),
          stockReservedAt: now,
        }).returning()

        if (appliedCoupon) {
          await tx.insert(couponRedemptions).values({
            couponId: appliedCoupon.id,
            orderId: created.id,
            userId,
            discountAmount: discount.toString(),
          })
        }

        await tx.insert(orderItems).values(
          lineItems.map(({ product, quantity, price }) => ({
            orderId: created.id,
            productId: product.id,
            productName: product.name,
            qty: quantity,
            priceSnapshot: price.toString(),
          }))
        )
        return created
      })
    } catch (e) {
      if (e instanceof OrderError) return reply.code(e.code).send({ success: false, error: e.message })
      throw e
    }

    // Notify seller about new order (fire-and-forget)
    try {
      const shop = await db.query.shops.findFirst({
        where: eq(shops.id, body.shopId),
        with: { owner: true },
      })
      if (shop?.owner) {
        const itemSummary = lineItems
          .map(i => `${i.product.name} x${i.quantity}`)
          .join(", ")
        await notifyOrderStatus({
          userId: shop.owner.id,
          orderId: order.id,
          title: `🛒 มีออเดอร์ใหม่! #${order.id.slice(0, 8).toUpperCase()}`,
          body: `ยอดรวม ฿${total.toLocaleString()} — ${itemSummary}`,
        })
      }
    } catch (e) {
      app.log.warn("notify seller failed (non-critical):", e)
    }

    return reply.code(201).send({ success: true, data: order })
  })

  // Get orders (buyer)
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const rows = await db.query.orders.findMany({
      where: eq(orders.buyerId, userId),
      with: { items: true },
      orderBy: [orders.createdAt],
    })
    return { success: true, data: rows }
  })

  // Get order by id
  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true },
    })
    if (!order) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })
    const { userId } = request.user as { userId: string }
    const { role } = await getOrderRole(userId, id)
    if (!role) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })

    // Receipt for a paid order: only the fields a buyer/seller needs (never the raw gateway payload).
    const [paid] = await db.select().from(payments)
      .where(and(eq(payments.orderId, id), eq(payments.status, "verified")))
    const payment = paid ? {
      id: paid.id,
      method: paid.method,
      provider: paid.provider,
      reference: paid.providerRef ?? paid.reference,
      amount: paid.paidAmount ?? paid.amount,
      currency: paid.currency,
      paidAt: paid.verifiedAt ?? paid.createdAt,
    } : null
    return { success: true, data: { ...order, payment } }
  })

  // Dashboard stats for my shop (seller)
  app.get("/shop/stats", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
    if (!shop) {
      return { success: true, data: { todayOrders: 0, totalProducts: 0, monthRevenue: 0, pendingOrders: 0 } }
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const shopOrders = await db.query.orders.findMany({
      where: eq(orders.shopId, shop.id),
    })

    const todayOrders = shopOrders.filter(o =>
      new Date(o.createdAt) >= todayStart
    ).length

    const pendingOrders = shopOrders.filter(o =>
      o.status === "paid" || o.status === "preparing"
    ).length

    const monthRevenue = shopOrders
      .filter(o =>
        new Date(o.createdAt) >= monthStart &&
        ["paid", "preparing", "shipped", "delivered"].includes(o.status)
      )
      .reduce((sum, o) => sum + Number(o.total), 0)

    const shopProducts = await db.query.products.findMany({
      where: eq(products.shopId, shop.id),
    })
    const totalProducts = shopProducts.length
    const activeProducts = shopProducts.filter(p => p.status === "active").length
    const lowStockProducts = shopProducts.filter(p => p.stock > 0 && p.stock <= 5).length
    const outOfStockProducts = shopProducts.filter(p => p.stock === 0).length

    return {
      success: true,
      data: {
        todayOrders,
        pendingOrders,
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        monthRevenue,
        shopName: shop.name,
        shopId: shop.id,
      }
    }
  })

  // ── Analytics: revenue trend + top products ────────────────────────────────
  // GET /orders/shop/analytics?period=7d|30d|3m
  app.get("/shop/analytics", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
    if (!shop) return reply.code(404).send({ success: false, error: "ไม่พบร้านค้า" })

    const { period = "30d" } = request.query as { period?: string }
    const days = period === "7d" ? 7 : period === "3m" ? 90 : 30

    // Daily revenue for the past N days
    const dailyRevenue = await rawSql`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Bangkok') AS day,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(total::numeric), 0)::float AS revenue
      FROM orders
      WHERE shop_id = ${shop.id}
        AND status IN ('paid','preparing','shipped','delivered','completed')
        AND created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `

    // Top products by revenue
    const topProducts = await rawSql`
      SELECT
        oi.product_name,
        SUM(oi.qty)::int AS total_qty,
        SUM(oi.qty * oi.price_snapshot::numeric)::float AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.shop_id = ${shop.id}
        AND o.status IN ('paid','preparing','shipped','delivered','completed')
        AND o.created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `

    // Summary totals
    const summary = await rawSql`
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(total::numeric), 0)::float AS total_revenue,
        COALESCE(AVG(total::numeric), 0)::float AS avg_order_value
      FROM orders
      WHERE shop_id = ${shop.id}
        AND status IN ('paid','preparing','shipped','delivered','completed')
        AND created_at >= NOW() - (${days} || ' days')::interval
    `

    // Status breakdown
    const statusBreakdown = await rawSql`
      SELECT status, COUNT(*)::int AS count
      FROM orders
      WHERE shop_id = ${shop.id}
        AND created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY status
    `

    return {
      success: true,
      data: {
        period,
        days,
        summary: summary[0] ?? { total_orders: 0, total_revenue: 0, avg_order_value: 0 },
        dailyRevenue,
        topProducts,
        statusBreakdown,
      }
    }
  })

  // Get orders for my shop (seller)
  app.get("/shop", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
    if (!shop) return { success: true, data: [] }
    const rows = await db.query.orders.findMany({
      where: eq(orders.shopId, shop.id),
      with: { items: true, buyer: true },
      orderBy: [orders.createdAt],
    })
    return { success: true, data: rows }
  })

  // Cancel an unpaid order (buyer). Paid orders go through the seller / refund flow instead.
  app.post("/:id/cancel", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })
    }
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) })
    if (!order || order.buyerId !== userId) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })

    const result = await cancelOrder(id, "buyer_cancelled", {
      actorId: userId,
      onlyIf: (o) => o.status === "pending_payment",
    })
    if (!result.ok) {
      return reply.code(409).send({ success: false, error: "ยกเลิกไม่ได้ — ออเดอร์นี้ชำระเงินแล้วหรือไม่อยู่ในสถานะรอชำระเงิน" })
    }
    return { success: true, data: result.order }
  })

  // Update order status (seller)
  app.patch("/:id/status", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }

    const { order, role } = await getOrderRole(userId, id)
    if (!order) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })
    const allowed =
      role === "admin" ||
      (role === "seller" && SELLER_SETTABLE.includes(status)) ||
      (role === "buyer" && status === "delivered" && order.status === "shipped")
    if (!allowed) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เปลี่ยนสถานะออเดอร์นี้" })

    // Cancelling must also give back stock / coupon, so it never goes through a plain UPDATE.
    let updated: typeof orders.$inferSelect
    if (status === "cancelled") {
      const result = await cancelOrder(id, role === "admin" ? "admin_cancelled" : "seller_cancelled", { actorId: userId })
      if (!result.ok) {
        return reply.code(409).send({ success: false, error: "ออเดอร์นี้ยกเลิกไม่ได้แล้ว (จัดส่งหรือเสร็จสิ้นแล้ว)" })
      }
      updated = result.order
    } else {
      ;[updated] = await db.update(orders)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning()
    }

    const label = STATUS_LABELS[status] || status
    await notifyOrderStatus({
      userId: updated.buyerId,
      orderId: updated.id,
      title: `ออเดอร์ #${updated.id.slice(0, 8).toUpperCase()} — ${label}`,
      body: `สถานะออเดอร์ของคุณเปลี่ยนเป็น "${label}"`,
    })

    return { success: true, data: updated }
  })

  // Update tracking number (seller) — auto-sets status to "shipped"
  app.patch("/:id/tracking", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const { order: target, role } = await getOrderRole(userId, id)
    if (!target) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })
    if (role !== "admin" && role !== "seller") {
      return reply.code(403).send({ success: false, error: "เฉพาะร้านค้าเจ้าของออเดอร์เท่านั้น" })
    }
    const { trackingNumber, logisticsProvider, note } = request.body as {
      trackingNumber: string
      logisticsProvider: string
      note?: string
    }
    const [updated] = await db.update(orders)
      .set({ trackingNumber, logisticsProvider, status: "shipped" as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()

    const isLineCommunity = logisticsProvider === "ส่งผ่านชุมชน (LINE)"

    // Notify buyer
    await notifyOrderStatus({
      userId: updated.buyerId,
      orderId: updated.id,
      title: `ออเดอร์ #${updated.id.slice(0, 8).toUpperCase()} — จัดส่งแล้ว`,
      body: isLineCommunity
        ? "ไรเดอร์ชุมชนรับงานแล้ว กำลังนำส่งถึงคุณ"
        : `พัสดุถูกส่งผ่าน ${logisticsProvider} เลขพัสดุ ${trackingNumber}`,
    })

    // If LINE community delivery → send LINE Notify to the group
    if (isLineCommunity) {
      try {
        const shop = await rawSql`
          SELECT s.line_notify_token, s.name,
                 o.delivery_address, o.id as order_id
          FROM shops s
          JOIN orders o ON o.shop_id = s.id
          WHERE s.owner_id = ${userId} AND o.id = ${id}
          LIMIT 1
        `
        const token = shop[0]?.line_notify_token
        if (token) {
          const addr = shop[0].delivery_address as any
          const items = await rawSql`
            SELECT product_name, qty FROM order_items WHERE order_id = ${id}
          `
          const itemList = items.map((i: any) => `${i.product_name} x${i.qty}`).join(", ")
          const addrStr = `${addr.address} ${addr.district} ${addr.province} ${addr.zip_code || addr.zipCode || ""}`
          const msg = [
            "",
            `📦 มีงานส่ง! #${id.slice(0, 8).toUpperCase()}`,
            `🛍 สินค้า: ${itemList}`,
            `📍 ที่อยู่: ${addrStr}`,
            `👤 ผู้รับ: ${addr.name} ${addr.phone}`,
            note ? `💬 หมายเหตุ: ${note}` : "",
            `✅ ตอบกลับข้อความนี้เพื่อรับงาน`,
          ].filter(Boolean).join("\n")
          await sendLineNotify(token, msg)
        }
      } catch (e) {
        console.warn("LINE Notify community delivery failed:", e)
      }
    }

    return { success: true, data: updated }
  })
}
