import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { communities, communityMembers, shops, products, users } from "../../db/schema.js"
import { eq, ilike, and, sql, isNotNull } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"
import { haversineDistanceKm } from "../../lib/geo.js"

const ZONE_RADIUS_KM = 10

const createCommunitySchema = z.object({
  name: z.string().min(3),
  province: z.string(),
  district: z.string(),
  subdistrict: z.string(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export async function communityRoutes(app: FastifyInstance) {

  // ── Check zone availability ─────────────────────────────────────────────────
  // GET /communities/check-zone?lat=13.7&lng=100.5
  app.get("/check-zone", async (request, reply) => {
    const { lat, lng } = request.query as { lat?: string; lng?: string }
    if (!lat || !lng) return reply.code(400).send({ success: false, error: "ต้องระบุ lat และ lng" })

    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    if (isNaN(latN) || isNaN(lngN)) return reply.code(400).send({ success: false, error: "lat/lng ไม่ถูกต้อง" })

    const existingWithCoords = await db.select({
      id: communities.id,
      name: communities.name,
      lat: communities.lat,
      lng: communities.lng,
    })
    .from(communities)
    .where(and(isNotNull(communities.lat), isNotNull(communities.lng)))

    let nearest: { name: string; distanceKm: number } | null = null
    for (const c of existingWithCoords) {
      if (c.lat == null || c.lng == null) continue
      const dist = haversineDistanceKm({ lat: latN, lng: lngN }, { lat: c.lat, lng: c.lng })
      if (dist < ZONE_RADIUS_KM) {
        if (!nearest || dist < nearest.distanceKm) {
          nearest = { name: c.name, distanceKm: Math.round(dist * 10) / 10 }
        }
      }
    }

    if (nearest) {
      return {
        success: true,
        available: false,
        conflict: nearest,
        message: `มีชุมชน "${nearest.name}" อยู่ห่างแค่ ${nearest.distanceKm} km — ต้องห่างกันอย่างน้อย ${ZONE_RADIUS_KM} km`,
      }
    }

    return { success: true, available: true, message: "พื้นที่นี้ยังว่างอยู่ สามารถสร้างชุมชนได้" }
  })

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

    // ดึงสินค้าจากทุกร้านในชุมชน
    const productList = communityShops.length
      ? (await Promise.all(
          communityShops.map(shop =>
            db.query.products.findMany({
              where: and(eq(products.shopId, shop.id), eq(products.status, "active")),
              with: { shop: { with: { community: true } } },
            })
          )
        )).flat()
      : []

    return {
      success: true,
      data: {
        community,
        products: productList,
        shopCount: communityShops.length,
        // Only unambiguous to offer a single "chat with seller" button when
        // there's exactly one shop — a community can have several independent
        // sellers, so there's no single "community owner" to chat with otherwise.
        shop: communityShops.length === 1 ? communityShops[0] : null,
      },
    }
  })

  // Get MY community (the one I'm admin of)
  app.get("/my", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const membership = await db.query.communityMembers.findFirst({
      where: and(eq(communityMembers.userId, userId), eq(communityMembers.role, "admin")),
      with: { community: true },
    })
    if (!membership) return reply.code(404).send({ success: false, error: "ยังไม่มีชุมชน" })
    return { success: true, data: membership.community }
  })

  // Update community
  app.patch("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    // ตรวจสอบว่าเป็น admin ของชุมชนนี้
    const membership = await db.query.communityMembers.findFirst({
      where: and(eq(communityMembers.communityId, id), eq(communityMembers.userId, userId), eq(communityMembers.role, "admin")),
    })
    if (!membership) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์แก้ไข" })

    const updateSchema = z.object({
      name: z.string().min(3).optional(),
      description: z.string().optional(),
      province: z.string().optional(),
      district: z.string().optional(),
      subdistrict: z.string().optional(),
      logoUrl: z.string().url().optional().nullable(),
      bannerUrl: z.string().url().optional().nullable(),
    })
    const body = updateSchema.parse(request.body)
    const [updated] = await db.update(communities).set(body).where(eq(communities.id, id)).returning()
    return { success: true, data: updated }
  })

  // ── Check my membership in a community ─────────────────────────────────────
  app.get("/:id/my-membership", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const membership = await db.query.communityMembers.findFirst({
      where: and(eq(communityMembers.communityId, id), eq(communityMembers.userId, userId)),
    })
    const shop = membership
      ? await db.query.shops.findFirst({ where: and(eq(shops.communityId, id), eq(shops.ownerId, userId)) })
      : null

    return {
      success: true,
      data: {
        isMember: !!membership,
        role: membership?.role ?? null,
        hasShop: !!shop,
        shopId: shop?.id ?? null,
      }
    }
  })

  // ── Join community ──────────────────────────────────────────────────────────
  app.post("/:id/join", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const community = await db.query.communities.findFirst({ where: eq(communities.id, id) })
    if (!community) return reply.code(404).send({ success: false, error: "ไม่พบชุมชน" })

    const existing = await db.query.communityMembers.findFirst({
      where: and(eq(communityMembers.communityId, id), eq(communityMembers.userId, userId)),
    })
    if (existing) return reply.code(400).send({ success: false, error: "คุณเป็นสมาชิกแล้ว" })

    await db.insert(communityMembers).values({ communityId: id, userId, role: "member" })
    await db.update(communities).set({ memberCount: sql`${communities.memberCount} + 1` }).where(eq(communities.id, id))

    return { success: true, data: { role: "member" } }
  })

  // ── Open a shop inside a community (member → seller) ──────────────────────
  app.post("/:id/open-shop", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    // ต้องเป็นสมาชิกก่อน
    const membership = await db.query.communityMembers.findFirst({
      where: and(eq(communityMembers.communityId, id), eq(communityMembers.userId, userId)),
    })
    if (!membership) return reply.code(403).send({ success: false, error: "กรุณาเข้าร่วมชุมชนก่อน" })

    // ตรวจสอบว่ามีร้านในชุมชนนี้แล้วหรือยัง
    const existingShop = await db.query.shops.findFirst({
      where: and(eq(shops.communityId, id), eq(shops.ownerId, userId)),
    })
    if (existingShop) return reply.code(400).send({ success: false, error: "คุณมีร้านในชุมชนนี้แล้ว", shopId: existingShop.id })

    const { shopName, shopDescription } = request.body as { shopName?: string; shopDescription?: string }
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })

    // สร้างร้าน
    const [shop] = await db.insert(shops).values({
      communityId: id,
      ownerId: userId,
      name: shopName || `ร้านของ${user?.name || "ฉัน"}`,
      description: shopDescription,
    }).returning()

    // อัปเกรด role เป็น seller
    await db.update(communityMembers)
      .set({ role: "seller" })
      .where(and(eq(communityMembers.communityId, id), eq(communityMembers.userId, userId)))

    return reply.code(201).send({ success: true, data: { shop, role: "seller" } })
  })

  // Create community (requires auth)
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }

    // จำกัด 1 ชุมชนต่อ user
    const existing = await db.query.communityMembers.findFirst({
      where: and(eq(communityMembers.userId, userId), eq(communityMembers.role, "admin")),
    })
    if (existing) {
      return reply.code(400).send({ success: false, error: "คุณมีชุมชนแล้ว 1 ชุมชน — ไม่สามารถสร้างเพิ่มได้" })
    }

    const body = createCommunitySchema.parse(request.body)

    // ── Zone check: ห้ามสร้างชุมชนในรัศมี 10 km จากชุมชนที่มีอยู่ ──────────
    const existingWithCoords = await db.select({
      id: communities.id,
      name: communities.name,
      lat: communities.lat,
      lng: communities.lng,
    })
    .from(communities)
    .where(and(isNotNull(communities.lat), isNotNull(communities.lng)))

    for (const c of existingWithCoords) {
      if (c.lat == null || c.lng == null) continue
      const dist = haversineDistanceKm({ lat: body.lat, lng: body.lng }, { lat: c.lat, lng: c.lng })
      if (dist < ZONE_RADIUS_KM) {
        return reply.code(409).send({
          success: false,
          error: `ไม่สามารถสร้างชุมชนได้ — มีชุมชน "${c.name}" อยู่ห่างแค่ ${Math.round(dist * 10) / 10} km (ต้องห่างกันอย่างน้อย ${ZONE_RADIUS_KM} km)`,
        })
      }
    }

    const slug = body.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      + "-" + Date.now().toString(36)

    const [community] = await db.insert(communities).values({ ...body, slug }).returning()
    await db.insert(communityMembers).values({ communityId: community.id, userId, role: "admin" })
    // Auto-create a shop for this community admin
    await db.insert(shops).values({ communityId: community.id, ownerId: userId, name: body.name, description: body.description })

    return reply.code(201).send({ success: true, data: community })
  })
}
