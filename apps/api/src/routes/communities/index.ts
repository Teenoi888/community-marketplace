import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { communities, communityMembers, shops, products } from "../../db/schema.js"
import { eq, ilike, and, sql } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

const createCommunitySchema = z.object({
  name: z.string().min(3),
  province: z.string(),
  district: z.string(),
  subdistrict: z.string(),
  description: z.string().optional(),
})

export async function communityRoutes(app: FastifyInstance) {

  // List communities
  app.get("/", async (request) => {
    const { province, search, featured, limit = "20", page = "1" } = request.query as Record<string, string>
    const limitN = Math.min(Number(limit), 50)
    const offset = (Number(page) - 1) * limitN

    const conditions = []
    if (province) conditions.push(eq(communities.province, province))
    if (search) conditions.push(ilike(communities.name, `%${search}%`))

    const rows = await db.query.communities.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      limit: limitN,
      offset,
      orderBy: featured ? [communities.memberCount] : [communities.createdAt],
    })

    // Attach product counts
    const withStats = await Promise.all(rows.map(async (c) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .innerJoin(shops, eq(shops.id, products.shopId))
        .where(eq(shops.communityId, c.id))
      return { ...c, productCount: Number(count) }
    }))

    return { success: true, data: withStats }
  })

  // Get community by slug
  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const community = await db.query.communities.findFirst({ where: eq(communities.slug, slug) })
    if (!community) return reply.code(404).send({ success: false, error: "ไม่พบชุมชน" })

    const communityShops = await db.query.shops.findMany({ where: eq(shops.communityId, community.id) })
    const shopIds = communityShops.map((s) => s.id)
    const productList = shopIds.length
      ? await db.query.products.findMany({ where: eq(products.shopId, shopIds[0]) })
      : []

    return { success: true, data: { community, products: productList } }
  })

  // Create community (requires auth)
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const body = createCommunitySchema.parse(request.body)
    const slug = body.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      + "-" + Date.now().toString(36)

    const [community] = await db.insert(communities).values({ ...body, slug }).returning()
    await db.insert(communityMembers).values({ communityId: community.id, userId, role: "admin" })

    return reply.code(201).send({ success: true, data: community })
  })
}
