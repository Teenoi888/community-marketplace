import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { products, shops, communities } from "../../db/schema.js"
import { eq, ilike, and } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"
import { haversineDistanceKm } from "../../lib/geo.js"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

/** postgres.js returns jsonb columns as strings when using raw SQL — parse safely */
function parseImages(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === "string") { try { return JSON.parse(val) } catch { return [] } }
  return []
}

const variantOptionSchema = z.object({
  label: z.string(),
  additionalPrice: z.number().default(0),
  stock: z.number().int().min(0).default(0),
})
const variantGroupSchema = z.object({
  name: z.string(),
  options: z.array(variantOptionSchema),
})

const createProductSchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  images: z.array(z.string().url()).default([]),
  category: z.string(),
  variants: z.array(variantGroupSchema).default([]),
})

export async function productRoutes(app: FastifyInstance) {

  // List products (marketplace or seller=me)
  app.get("/", async (request) => {
    const { category, communityId, province, search, seller, lat, lng, maxDistanceKm, limit = "20", page = "1" } = request.query as Record<string, string>
    const limitN = Math.min(Number(limit), 50)
    const offset = (Number(page) - 1) * limitN
    const origin = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null

    // If seller=me, return products from ALL shops the user owns
    if (seller === "me") {
      try {
        await request.jwtVerify()
        const { userId } = request.user as { userId: string }
        const userShops = await db.query.shops.findMany({ where: eq(shops.ownerId, userId) })
        if (!userShops.length) return { success: true, data: [] }
        const rows = (await Promise.all(
          userShops.map(shop =>
            db.query.products.findMany({
              where: eq(products.shopId, shop.id),
              with: { shop: { with: { community: true } } },
            })
          )
        )).flat()
        // sort newest first
        rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        return { success: true, data: rows }
      } catch {
        return { success: true, data: [] }
      }
    }

    // Province filter requires joining through shop→community, use raw SQL path
    // When both search and province are given (e.g. from search page), return results matching EITHER
    if (province) {
      const rows = await sql`
        SELECT DISTINCT p.*, s.name AS shop_name, s.id AS shop_id_val,
               c.name AS community_name, c.slug AS community_slug, c.province, c.district
        FROM products p
        JOIN shops s ON s.id = p.shop_id
        JOIN communities c ON c.id = s.community_id
        WHERE p.status = 'active'
          AND (
            c.province ILIKE ${`%${province}%`}
            ${search ? sql`OR p.name ILIKE ${`%${search}%`}` : sql``}
          )
          ${category ? sql`AND p.category = ${category}` : sql``}
        ORDER BY p.created_at DESC
        LIMIT ${limitN} OFFSET ${offset}
      `
      return {
        success: true,
        data: rows.map((r: any) => ({
          id: r.id, name: r.name, price: r.price, images: parseImages(r.images), stock: r.stock,
          category: r.category, status: r.status, createdAt: r.created_at,
          shop: { id: r.shop_id_val, name: r.shop_name, community: { name: r.community_name, slug: r.community_slug, province: r.province, district: r.district } },
        })),
      }
    }

    const where = and(
      search ? ilike(products.name, `%${search}%`) : undefined,
      category ? eq(products.category, category) : undefined,
      eq(products.status, "active"),
    )

    // "Near me" sorting requires distance computed per-row, so page in JS
    // instead of at the DB level when an origin point is given.
    if (origin) {
      const all = await db.query.products.findMany({
        where,
        with: { shop: { with: { community: true } } },
      })

      const withDistance = all
        .filter(p => p.shop.community?.lat != null && p.shop.community?.lng != null)
        .map(p => ({
          ...p,
          distanceKm: haversineDistanceKm(origin, { lat: p.shop.community!.lat!, lng: p.shop.community!.lng! }),
        }))
        .filter(p => !maxDistanceKm || p.distanceKm <= Number(maxDistanceKm))
        .sort((a, b) => a.distanceKm - b.distanceKm)

      return { success: true, data: withDistance.slice(offset, offset + limitN) }
    }

    const rows = await db.query.products.findMany({
      where,
      with: { shop: { with: { community: true } } },
      limit: limitN,
      offset,
    })

    return { success: true, data: rows }
  })

  // GET /products/recommendations/home — popular products for homepage (most ordered + reviewed)
  app.get("/recommendations/home", async () => {
    const rows = await sql`
      SELECT
        p.id, p.name, p.price, p.images, p.stock, p.category,
        p.shop_id,
        s.name AS shop_name, s.id AS shop_id_val,
        c.name AS community_name, c.slug AS community_slug,
        c.province, c.district,
        COUNT(DISTINCT oi.id)::int AS order_count,
        COUNT(DISTINCT r.id)::int AS review_count,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN communities c ON c.id = s.community_id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.status = 'active' AND p.stock > 0
      GROUP BY p.id, s.name, s.id, c.name, c.slug, c.province, c.district
      ORDER BY (COUNT(DISTINCT oi.id) * 2 + COUNT(DISTINCT r.id)) DESC
      LIMIT 10
    `
    const data = rows.map(r => ({
      id: r.id,
      name: r.name,
      price: r.price,
      images: parseImages(r.images),
      stock: r.stock,
      category: r.category,
      orderCount: r.order_count,
      reviewCount: r.review_count,
      avgRating: Number(r.avg_rating || 0),
      shop: {
        id: r.shop_id_val,
        name: r.shop_name,
        community: { name: r.community_name, slug: r.community_slug, province: r.province, district: r.district },
      },
    }))
    return { success: true, data }
  })

  // GET /products/recommendations/:id — same-category products (excluding current, same community first)
  app.get("/recommendations/:id", async (request) => {
    const { id } = request.params as { id: string }

    // Get the product to know its category and community
    const base = await sql`
      SELECT p.category, s.community_id
      FROM products p JOIN shops s ON s.id = p.shop_id
      WHERE p.id = ${id}
      LIMIT 1
    `
    if (!base.length) return { success: true, data: [] }
    const { category, community_id } = base[0]

    const rows = await sql`
      SELECT
        p.id, p.name, p.price, p.images, p.stock, p.category,
        s.id AS shop_id, s.name AS shop_name,
        c.name AS community_name, c.slug AS community_slug, c.province, c.district,
        COUNT(DISTINCT r.id)::int AS review_count,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        CASE WHEN s.community_id = ${community_id} THEN 1 ELSE 0 END AS same_community
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN communities c ON c.id = s.community_id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.status = 'active'
        AND p.stock > 0
        AND p.category = ${category}
        AND p.id != ${id}
      GROUP BY p.id, s.id, s.name, s.community_id, c.name, c.slug, c.province, c.district
      ORDER BY same_community DESC, review_count DESC
      LIMIT 8
    `
    const data = rows.map(r => ({
      id: r.id,
      name: r.name,
      price: r.price,
      images: parseImages(r.images),
      stock: r.stock,
      category: r.category,
      reviewCount: r.review_count,
      avgRating: Number(r.avg_rating || 0),
      shop: {
        id: r.shop_id,
        name: r.shop_name,
        community: { name: r.community_name, slug: r.community_slug, province: r.province, district: r.district },
      },
    }))
    return { success: true, data }
  })

  // Get product by id — raw SQL to match other routes (avoids Drizzle ORM query builder issues)
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const rows = await sql`
      SELECT
        p.id, p.name, p.description, p.price, p.stock, p.images, p.category,
        p.status, p.variants, p.created_at,
        s.id AS shop_id, s.name AS shop_name, s.owner_id AS shop_owner_id,
        c.id AS community_id, c.name AS community_name,
        c.slug AS community_slug, c.province, c.district,
        COALESCE(SUM(oi.qty) FILTER (
          WHERE o.status IN ('paid', 'preparing', 'shipped', 'delivered')
        ), 0)::int AS sold_count
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN communities c ON c.id = s.community_id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE p.id = ${id}
      GROUP BY p.id, s.id, s.name, s.owner_id, c.id, c.name, c.slug, c.province, c.district
      LIMIT 1
    `
    if (!rows.length) return reply.code(404).send({ success: false, error: "ไม่พบสินค้า" })
    const r = rows[0]
    return {
      success: true,
      data: {
        id: r.id,
        name: r.name,
        description: r.description,
        price: r.price,
        stock: r.stock,
        images: parseImages(r.images),
        category: r.category,
        status: r.status,
        variants: r.variants ? (typeof r.variants === "string" ? JSON.parse(r.variants) : r.variants) : [],
        createdAt: r.created_at,
        soldCount: r.sold_count,
        shop: {
          id: r.shop_id,
          name: r.shop_name,
          ownerId: r.shop_owner_id,
          community: {
            id: r.community_id,
            name: r.community_name,
            slug: r.community_slug,
            province: r.province,
            district: r.district,
          },
        },
      },
    }
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
