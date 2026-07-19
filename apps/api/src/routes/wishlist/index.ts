import type { FastifyInstance } from "fastify"
import { db } from "../../db/index.js"
import { wishlistItems, products } from "../../db/schema.js"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

export async function wishlistRoutes(app: FastifyInstance) {

  // GET /wishlist — รายการ wishlist ของฉัน
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.userId, userId),
      with: {
        product: {
          with: {
            shop: {
              columns: { name: true, id: true },
              with: { community: { columns: { name: true, slug: true } } },
            },
          },
        },
      },
      orderBy: [wishlistItems.createdAt],
    })
    return { success: true, data: items.map(i => i.product ? { ...i.product, wishlistId: i.id } : null).filter(Boolean) }
  })

  // GET /wishlist/ids — แค่ product IDs (สำหรับ check สถานะปุ่มหัวใจ)
  app.get("/ids", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.userId, userId),
      columns: { productId: true },
    })
    return { success: true, data: items.map(i => i.productId) }
  })

  // POST /wishlist/:productId — เพิ่มใน wishlist
  app.post("/:productId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { productId } = request.params as { productId: string }

    const product = await db.query.products.findFirst({ where: eq(products.id, productId) })
    if (!product) return reply.code(404).send({ success: false, error: "ไม่พบสินค้า" })

    try {
      const [item] = await db.insert(wishlistItems).values({ userId, productId }).returning()
      return reply.code(201).send({ success: true, data: item })
    } catch {
      return reply.code(400).send({ success: false, error: "มีสินค้านี้ใน wishlist แล้ว" })
    }
  })

  // DELETE /wishlist/:productId — ลบออกจาก wishlist
  app.delete("/:productId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { productId } = request.params as { productId: string }
    await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    return { success: true }
  })
}
