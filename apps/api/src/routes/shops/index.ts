import type { FastifyInstance } from "fastify"
import { db } from "../../db/index.js"
import { shops } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

export async function shopRoutes(app: FastifyInstance) {

  // GET /shops/:shopId/rating — aggregate rating from all product reviews in a shop (public)
  app.get("/:shopId/rating", async (request, reply) => {
    const { shopId } = request.params as { shopId: string }

    const agg = await sql`
      SELECT
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        COUNT(r.id)::int AS total_reviews
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      WHERE p.shop_id = ${shopId}
    `

    const recent = await sql`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name AS user_name, u.avatar_url,
             p.name AS product_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      JOIN products p ON p.id = r.product_id
      WHERE p.shop_id = ${shopId}
      ORDER BY r.created_at DESC
      LIMIT 5
    `

    return {
      success: true,
      data: {
        avgRating: Number(agg[0]?.avg_rating || 0),
        totalReviews: Number(agg[0]?.total_reviews || 0),
        recentReviews: recent,
      },
    }
  })

  // GET /shops/my — get current seller's shop settings
  app.get("/my", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const rows = await sql`
      SELECT id, name, description, banner_url, is_active,
             line_notify_token, line_group_url
      FROM shops WHERE owner_id = ${userId} LIMIT 1
    `
    if (!rows.length) return reply.code(404).send({ success: false, error: "ไม่พบร้านค้า" })
    return { success: true, data: rows[0] }
  })

  // PATCH /shops/my — update shop settings (name, description, LINE token, LINE group URL)
  app.patch("/my", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { name, description, lineNotifyToken, lineGroupUrl } = request.body as {
      name?: string
      description?: string
      lineNotifyToken?: string
      lineGroupUrl?: string
    }

    const existing = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
    if (!existing) return reply.code(404).send({ success: false, error: "ไม่พบร้านค้า" })

    await sql`
      UPDATE shops SET
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        line_notify_token = COALESCE(${lineNotifyToken ?? null}, line_notify_token),
        line_group_url = COALESCE(${lineGroupUrl ?? null}, line_group_url)
      WHERE owner_id = ${userId}
    `

    return { success: true }
  })
}
