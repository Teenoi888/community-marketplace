import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { coupons, shops, users } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

const createCouponSchema = z.object({
  code: z.string().min(3).max(30).transform(s => s.toUpperCase().trim()),
  shopId: z.string().uuid().optional(), // omit only allowed for admins (platform-wide coupon)
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().nonnegative().default(0),
  maxDiscountAmount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
})

export async function findValidCoupon(code: string, shopId: string, subtotal: number) {
  const coupon = await db.query.coupons.findFirst({
    where: eq(coupons.code, code.toUpperCase().trim()),
  })
  if (!coupon || !coupon.active) return { error: "ไม่พบคูปองนี้ หรือคูปองถูกปิดใช้งาน" as const }
  if (coupon.shopId && coupon.shopId !== shopId) return { error: "คูปองนี้ใช้ไม่ได้กับร้านนี้" as const }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { error: "คูปองหมดอายุแล้ว" as const }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { error: "คูปองถูกใช้ครบจำนวนแล้ว" as const }
  if (subtotal < Number(coupon.minOrderAmount)) {
    return { error: `ยอดสั่งซื้อขั้นต่ำ ฿${Number(coupon.minOrderAmount).toLocaleString()}` as const }
  }

  let discount = coupon.discountType === "percent"
    ? subtotal * (Number(coupon.discountValue) / 100)
    : Number(coupon.discountValue)
  if (coupon.maxDiscountAmount != null) discount = Math.min(discount, Number(coupon.maxDiscountAmount))
  discount = Math.min(discount, subtotal)

  return { coupon, discount }
}

export async function couponRoutes(app: FastifyInstance) {

  // POST /coupons/validate — preview discount at checkout
  app.post("/validate", { preHandler: [requireAuth] }, async (request, reply) => {
    const { code, shopId, subtotal } = request.body as { code: string; shopId: string; subtotal: number }
    if (!code || !shopId || typeof subtotal !== "number") {
      return reply.code(400).send({ success: false, error: "ข้อมูลไม่ครบ" })
    }
    const result = await findValidCoupon(code, shopId, subtotal)
    if ("error" in result) return reply.code(400).send({ success: false, error: result.error })
    return { success: true, data: { discount: result.discount, code: result.coupon.code } }
  })

  // POST /coupons — create (sellers: own shop only; admins: shopId optional = platform-wide)
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const body = createCouponSchema.parse(request.body)

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (body.shopId) {
      const shop = await db.query.shops.findFirst({ where: eq(shops.id, body.shopId) })
      if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึงร้านนี้" })
    } else if (user?.role !== "admin") {
      return reply.code(403).send({ success: false, error: "ต้องระบุร้านค้า" })
    }

    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, body.code) })
    if (existing) return reply.code(400).send({ success: false, error: "โค้ดนี้ถูกใช้แล้ว กรุณาตั้งชื่ออื่น" })

    const [row] = await db.insert(coupons).values({
      code: body.code,
      shopId: body.shopId,
      discountType: body.discountType,
      discountValue: body.discountValue.toString(),
      minOrderAmount: body.minOrderAmount.toString(),
      maxDiscountAmount: body.maxDiscountAmount?.toString(),
      usageLimit: body.usageLimit,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    }).returning()

    return reply.code(201).send({ success: true, data: row })
  })

  // GET /coupons/mine?shopId= — seller's coupons for a shop
  app.get("/mine", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { shopId } = request.query as { shopId?: string }
    if (!shopId) return reply.code(400).send({ success: false, error: "ต้องระบุ shopId" })

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึงร้านนี้" })

    const rows = await db.query.coupons.findMany({
      where: eq(coupons.shopId, shopId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })
    return { success: true, data: rows }
  })

  // PATCH /coupons/:id — toggle active (seller, own shop's coupon only)
  app.patch("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const { active } = request.body as { active: boolean }

    const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) })
    if (!coupon) return reply.code(404).send({ success: false, error: "ไม่พบคูปอง" })
    if (coupon.shopId) {
      const shop = await db.query.shops.findFirst({ where: eq(shops.id, coupon.shopId) })
      if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์แก้ไขคูปองนี้" })
    } else {
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
      if (user?.role !== "admin") return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์แก้ไขคูปองนี้" })
    }

    const [updated] = await db.update(coupons).set({ active }).where(eq(coupons.id, id)).returning()
    return { success: true, data: updated }
  })
}
