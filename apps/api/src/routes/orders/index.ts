import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { orders, orderItems, products, shops } from "../../db/schema.js"
import { eq, and, gte, lte, sql } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"
import { sendLinePush } from "../line/index.js"

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
    province: z.string(),
    zipCode: z.string(),
  }),
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

    // Create order
    const [order] = await db.insert(orders).values({
      buyerId: userId,
      shopId: body.shopId,
      total: total.toString(),
      deliveryAddress: body.deliveryAddress,
      status: "pending_payment",
    }).returning()

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

    // Notify seller via LINE (fire-and-forget)
    try {
      const shop = await db.query.shops.findFirst({
        where: eq(shops.id, body.shopId),
        with: { owner: true },
      })
      if (shop?.owner?.lineUid) {
        const itemSummary = lineItems
          .map(i => `  • ${i.product.name} x${i.quantity} = ฿${(i.price * i.quantity).toLocaleString()}`)
          .join("\n")
        await sendLinePush(
          shop.owner.lineUid,
          `🛒 มีออเดอร์ใหม่!\n\n` +
          `รหัส: #${order.id.slice(0, 8).toUpperCase()}\n` +
          `ยอดรวม: ฿${total.toLocaleString()}\n\n` +
          `รายการสินค้า:\n${itemSummary}\n\n` +
          `👉 ดูออเดอร์: ${process.env.NEXT_PUBLIC_WEB_URL || "https://chumchon.market"}/seller/orders`
        )
      }
    } catch (e) {
      app.log.warn("LINE notify failed (non-critical):", e)
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

    // All orders for this shop
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

    // Count products
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
    const { status, cancelReason } = request.body as { status: string; cancelReason?: string }
    const [updated] = await db.update(orders)
      .set({
        status: status as any,
        ...(status === "cancelled" && cancelReason ? { cancelReason } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning()

    // Notify buyer when seller marks as shipped or delivered
    if (status === "shipped" || status === "delivered") {
      try {
        const order = await db.query.orders.findFirst({
          where: eq(orders.id, id),
          with: { buyer: true },
        })
        if (order?.buyer?.lineUid) {
          const msg = status === "shipped"
            ? `🚚 สินค้าของคุณถูกจัดส่งแล้ว!\n\nรหัสออเดอร์: #${id.slice(0, 8).toUpperCase()}\n👉 ติดตามพัสดุได้ที่: ${process.env.NEXT_PUBLIC_WEB_URL || "https://chumchon.market"}/orders/${id}`
            : `✅ สินค้าถึงมือคุณแล้ว!\n\nรหัสออเดอร์: #${id.slice(0, 8).toUpperCase()}\nขอบคุณที่ใช้บริการตลาดชุมชนครับ 🙏`
          await sendLinePush(order.buyer.lineUid, msg)
        }
      } catch (e) {
        app.log.warn("LINE notify buyer failed:", e)
      }
    }

    return { success: true, data: updated }
  })

  // Update tracking number (seller)
  app.patch("/:id/tracking", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string }
    const { trackingNumber, logisticsProvider } = request.body as { trackingNumber: string; logisticsProvider: string }
    const [updated] = await db.update(orders)
      .set({ trackingNumber, logisticsProvider, status: "shipped" as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()
    return { success: true, data: updated }
  })
}
