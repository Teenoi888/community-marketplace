import type { FastifyInstance } from "fastify"
import { requireAuth } from "../../middleware/auth.js"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

export async function reviewRoutes(app: FastifyInstance) {

  // GET /reviews?productId=xxx — public, returns reviews + avg rating
  app.get("/", async (request) => {
    const { productId } = request.query as { productId?: string }
    if (!productId) return { success: true, data: [], avgRating: 0, total: 0 }

    const rows = await sql`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name as user_name, u.avatar_url
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ${productId}
      ORDER BY r.created_at DESC
    `
    const agg = await sql`
      SELECT ROUND(AVG(rating)::numeric, 1) as avg, COUNT(*) as total
      FROM reviews WHERE product_id = ${productId}
    `
    return {
      success: true,
      data: rows,
      avgRating: Number(agg[0]?.avg || 0),
      total: Number(agg[0]?.total || 0),
    }
  })

  // GET /reviews/eligibility?productId=xxx — auth required
  // Returns whether user can review this product, and which orderId to use
  app.get("/eligibility", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { productId } = request.query as { productId?: string }
    if (!productId) return reply.code(400).send({ success: false, error: "productId required" })

    // Check if already reviewed
    const dup = await sql`
      SELECT id FROM reviews WHERE user_id = ${userId} AND product_id = ${productId} LIMIT 1
    `
    if (dup.length) {
      return { success: true, eligible: false, alreadyReviewed: true, orderId: null }
    }

    // Find a delivered order containing this product
    const eligible = await sql`
      SELECT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.buyer_id = ${userId}
        AND o.status = 'delivered'
        AND oi.product_id = ${productId}
      ORDER BY o.updated_at DESC
      LIMIT 1
    `
    if (!eligible.length) {
      return { success: true, eligible: false, alreadyReviewed: false, orderId: null }
    }

    return { success: true, eligible: true, alreadyReviewed: false, orderId: eligible[0].id }
  })

  // POST /reviews — auth required, must have delivered order with this product
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { productId, orderId, rating, comment } = request.body as {
      productId: string
      orderId: string
      rating: number
      comment?: string
    }

    if (!productId || !orderId || !rating || rating < 1 || rating > 5) {
      return reply.code(400).send({ success: false, error: "ข้อมูลไม่ครบ" })
    }

    // Verify: user must have a delivered order containing this product
    const eligible = await sql`
      SELECT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = ${orderId}
        AND o.buyer_id = ${userId}
        AND o.status = 'delivered'
        AND oi.product_id = ${productId}
      LIMIT 1
    `
    if (!eligible.length) {
      return reply.code(403).send({ success: false, error: "รีวิวได้เฉพาะสินค้าที่ได้รับแล้วเท่านั้น" })
    }

    // Check duplicate
    const dup = await sql`
      SELECT id FROM reviews WHERE user_id = ${userId} AND product_id = ${productId} LIMIT 1
    `
    if (dup.length) {
      return reply.code(409).send({ success: false, error: "คุณรีวิวสินค้านี้ไปแล้ว" })
    }

    await sql`
      INSERT INTO reviews (product_id, user_id, order_id, rating, comment)
      VALUES (${productId}, ${userId}, ${orderId}, ${rating}, ${comment || null})
    `

    return reply.code(201).send({ success: true })
  })
}
