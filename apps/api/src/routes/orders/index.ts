import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { orders, orderItems, products } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

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

  // Update order status (seller)
  app.patch("/:id/status", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }
    const [updated] = await db.update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()
    return { success: true, data: updated }
  })
}
