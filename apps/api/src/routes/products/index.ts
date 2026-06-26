import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { products, shops, communities } from "../../db/schema.js"
import { eq, ilike, and } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

const createProductSchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  images: z.array(z.string().url()).default([]),
  category: z.string(),
})

export async function productRoutes(app: FastifyInstance) {

  // List products (marketplace)
  app.get("/", async (request) => {
    const { category, communityId, search, limit = "20", page = "1" } = request.query as Record<string, string>
    const limitN = Math.min(Number(limit), 50)
    const offset = (Number(page) - 1) * limitN

    const rows = await db.query.products.findMany({
      where: and(
        search ? ilike(products.name, `%${search}%`) : undefined,
        category ? eq(products.category, category) : undefined,
        eq(products.status, "active"),
      ),
      with: { shop: { with: { community: true } } },
      limit: limitN,
      offset,
    })

    return { success: true, data: rows }
  })

  // Get product by id
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: { shop: { with: { community: true } } },
    })
    if (!product) return reply.code(404).send({ success: false, error: "ไม่พบสินค้า" })
    return { success: true, data: product }
  })

  // Create product (seller)
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createProductSchema.parse(request.body)
    const [product] = await db.insert(products).values({
      ...body,
      price: body.price.toString(),
    }).returning()
    return reply.code(201).send({ success: true, data: product })
  })

  // Update product
  app.patch("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const updates = request.body as Partial<z.infer<typeof createProductSchema>>
    const [updated] = await db.update(products).set({
      ...updates,
      price: updates.price?.toString(),
      updatedAt: new Date(),
    }).where(eq(products.id, id)).returning()
    return { success: true, data: updated }
  })

  // Delete product
  app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await db.delete(products).where(eq(products.id, id))
    return { success: true }
  })
}
