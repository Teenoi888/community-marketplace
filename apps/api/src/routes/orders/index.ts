import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { orders, orderItems, products, shops, coupons, couponRedemptions } from "../../db/schema.js"
import { eq, sql } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"
import { notifyOrderStatus } from "../../lib/notify.js"
import { findValidCoupon } from "../coupons/index.js"
import postgres from "postgres"

const rawSql = postgres(process.env.DATABASE_URL!, { max: 1 })

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

    // Fetch product prices & validate stock
    let total = 0
    const lineItems = []

    for (const item of body.items) {
      const product = await db.query.products.findFirst({ where: eq(products.id, item.productId) })
      if (!product) return reply.code(404).send({ success: false, error: `ไม่พบสินค้า ${item.productId}` })
      if (product.stock < item.quantity) {
        return reply.code(400).send({ success: false, error: `สินค้า "${product.name}" สต็อกไม่เพียงพอ` })
      }
      const price = Number(product.price)
      total += price * item.quantity
      lineItems.push({ product, quantity: item.quantity, price })
    }

    // Apply coupon (if any) — validated server-side again, never trust the discount from the client
    let discount = 0
    let appliedCoupon: typeof coupons.$inferSelect | null = null
    if (body.couponCode) {
      const result = await findValidCoupon(body.couponCode, body.shopId, total)
      if ("error" in result) return reply.code(400).send({ success: false, error: result.error })
      discount = result.discount
      appliedCoupon = result.coupon
    }
    const finalTotal = total - discount

    // Create order
    const [order] = await db.insert(orders).values({
      buyerId: userId,
      shopId: body.shopId,
      total: finalTotal.toString(),
      deliveryAddress: body.deliveryAddress,
      status: "pending_payment",
    }).returning()

    if (appliedCoupon) {
      await db.insert(couponRedemptions).values({
        couponId: appliedCoupon.id,
        orderId: order.id,
        userId,
        discountAmount: discount.toString(),
      })
      await db.update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, appliedCoupon.id))
    }

    // Reserve stock immediately when order is placed (prevents overselling)
    for (const { product, quantity } of lineItems) {
      await db.update(products)
        .set({ stock: sql`GREATEST(0, ${products.stock} - ${quantity})` })
        .where(eq(products.id, product.id))
    }

    // Insert order items
    await db.insert(orderItems).values(
      lineItems.map(({ product, quantity, price }) => ({
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        qty: quantity,
        priceSnapshot: price.toString(),
      }))
    )

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
    return { success: true, data: order }
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

  // Update order status (seller)
  app.patch("/:id/status", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }
    const [updated] = await db.update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()

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
  app.patch("/:id/tracking", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
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
