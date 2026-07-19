import type { FastifyInstance } from "fastify"
import { db } from "../../db/index.js"
import { products, shops, stockLogs } from "../../db/schema.js"
import { eq, and, desc, sql } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

export async function stockRoutes(app: FastifyInstance) {

  // GET /stock — list my shop products with stock info
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
    if (!shop) return reply.code(404).send({ success: false, error: "ไม่พบร้านค้า" })

    const rows = await db.query.products.findMany({
      where: eq(products.shopId, shop.id),
      orderBy: [products.stock],
    })

    return { success: true, data: rows }
  })

  // PATCH /stock/:productId — adjust stock
  app.patch("/:productId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { productId } = request.params as { productId: string }
    const { delta, reason = "manual", note } = request.body as { delta: number; reason?: string; note?: string }

    if (typeof delta !== "number" || delta === 0) {
      return reply.code(400).send({ success: false, error: "delta ต้องเป็นตัวเลขและไม่ใช่ 0" })
    }

    // ตรวจสอบสิทธิ์ — ต้องเป็นเจ้าของร้าน
    const product = await db.query.products.findFirst({ where: eq(products.id, productId) })
    if (!product) return reply.code(404).send({ success: false, error: "ไม่พบสินค้า" })

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, product.shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์แก้ไข" })

    const newStock = Math.max(0, product.stock + delta)

    // อัปเดต stock + สถานะ
    let newStatus = product.status
    if (newStock === 0) newStatus = "out_of_stock"
    else if (product.status === "out_of_stock") newStatus = "active"

    const [updated] = await db.update(products)
      .set({ stock: newStock, status: newStatus, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning()

    // บันทึก log
    await db.insert(stockLogs).values({ productId, userId, delta, reason, note })

    return { success: true, data: updated }
  })

  // GET /stock/:productId/logs — stock adjustment history
  app.get("/:productId/logs", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { productId } = request.params as { productId: string }

    const product = await db.query.products.findFirst({ where: eq(products.id, productId) })
    if (!product) return reply.code(404).send({ success: false, error: "ไม่พบสินค้า" })

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, product.shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์" })

    const logs = await db.query.stockLogs.findMany({
      where: eq(stockLogs.productId, productId),
      with: { user: { columns: { name: true } } },
      orderBy: [desc(stockLogs.createdAt)],
      limit: 50,
    })

    return { success: true, data: logs }
  })
}
