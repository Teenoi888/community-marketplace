import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { flashSales, products, shops } from "../../db/schema.js"
import { eq, and, gte, lte, sql } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

const createSchema = z.object({
  productId: z.string().uuid(),
  discountPct: z.number().int().min(1).max(99),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export async function flashSalesRoutes(app: FastifyInstance) {

  // GET /flash-sales — Flash sales ที่กำลัง active อยู่ (public)
  app.get("/", async () => {
    const now = new Date()
    const sales = await db.query.flashSales.findMany({
      where: and(
        eq(flashSales.isActive, true),
        lte(flashSales.startsAt, now),
        gte(flashSales.endsAt, now),
      ),
      with: {
        product: {
          with: { shop: { columns: { name: true, id: true } } },
        },
      },
      orderBy: [flashSales.endsAt],
    })
    // Attach discounted price
    const enriched = sales.map(s => ({
      ...s,
      discountedPrice: s.product
        ? Math.round(Number(s.product.price) * (1 - s.discountPct / 100))
        : null,
    }))
    return { success: true, data: enriched }
  })

  // GET /flash-sales/shop — Flash sales ของร้านฉัน (seller)
  app.get("/shop", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
    if (!shop) return reply.code(404).send({ success: false, error: "ไม่พบร้านค้า" })

    const sales = await db.query.flashSales.findMany({
      where: eq(flashSales.shopId, shop.id),
      with: { product: { columns: { name: true, price: true, images: true } } },
      orderBy: [flashSales.createdAt],
    })
    return { success: true, data: sales }
  })

  // POST /flash-sales — สร้าง flash sale (seller)
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
    if (!shop) return reply.code(404).send({ success: false, error: "ไม่พบร้านค้า" })

    const body = createSchema.parse(request.body)

    // ตรวจว่าสินค้าอยู่ในร้านนี้
    const product = await db.query.products.findFirst({ where: eq(products.id, body.productId) })
    if (!product || product.shopId !== shop.id) {
      return reply.code(403).send({ success: false, error: "สินค้านี้ไม่ใช่ของร้านคุณ" })
    }

    if (new Date(body.startsAt) >= new Date(body.endsAt)) {
      return reply.code(400).send({ success: false, error: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม" })
    }

    const [sale] = await db.insert(flashSales).values({
      ...body,
      shopId: shop.id,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
    }).returning()

    return reply.code(201).send({ success: true, data: sale })
  })

  // DELETE /flash-sales/:id — ยกเลิก flash sale (seller)
  app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const sale = await db.query.flashSales.findFirst({ where: eq(flashSales.id, id) })
    if (!sale) return reply.code(404).send({ success: false, error: "ไม่พบ flash sale" })

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, sale.shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์" })

    await db.update(flashSales).set({ isActive: false }).where(eq(flashSales.id, id))
    return { success: true }
  })
}
