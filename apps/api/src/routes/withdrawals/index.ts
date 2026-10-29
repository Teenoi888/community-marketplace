import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { withdrawalRequests, shops } from "../../db/schema.js"
import { eq, and, inArray } from "drizzle-orm"
import { getShopBalance } from "../../lib/payout.js"
import { logAdminActivity } from "../../lib/adminLog.js"
import { requireAuth, requireAdmin } from "../../middleware/auth.js"

const createWithdrawalSchema = z.object({
  shopId: z.string().uuid(),
  amount: z.number().positive(),
  bankName: z.string().min(2),
  accountName: z.string().min(2),
  accountNumber: z.string().min(4),
})

export async function withdrawalRoutes(app: FastifyInstance) {

  // GET /withdrawals/balance?shopId= — available balance for a seller's shop
  app.get("/balance", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { shopId } = request.query as { shopId?: string }
    if (!shopId) return reply.code(400).send({ success: false, error: "ต้องระบุ shopId" })

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึงร้านนี้" })

    const b = await getShopBalance(shopId)
    return { success: true, data: { balance: b.available, ...b } }
  })

  // GET /withdrawals/mine?shopId= — my withdrawal history for a shop
  app.get("/mine", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { shopId } = request.query as { shopId?: string }
    if (!shopId) return reply.code(400).send({ success: false, error: "ต้องระบุ shopId" })

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึงร้านนี้" })

    const rows = await db.query.withdrawalRequests.findMany({
      where: eq(withdrawalRequests.shopId, shopId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })
    return { success: true, data: rows }
  })

  // POST /withdrawals — request a payout
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const parsed = createWithdrawalSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: "ข้อมูลไม่ถูกต้อง" })
    const body = parsed.data

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, body.shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึงร้านนี้" })

    // Check the balance and insert the request under a lock on the shop row, so two simultaneous requests
    // can't both be approved against the same money.
    const amount = Math.round(body.amount * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) return reply.code(400).send({ success: false, error: "จำนวนเงินไม่ถูกต้อง" })
    const result = await db.transaction(async (tx) => {
      await tx.select({ id: shops.id }).from(shops).where(eq(shops.id, body.shopId)).for("update")
      const bal = await getShopBalance(body.shopId, tx)
      if (amount > bal.available) return { error: `ถอนได้ไม่เกิน ฿${bal.available.toLocaleString("th-TH")} (นับเฉพาะออเดอร์ที่ส่งถึงแล้วเกิน ${bal.holdDays} วัน และไม่มีการขอคืนเงิน)` }
      const [created] = await tx.insert(withdrawalRequests).values({
        shopId: body.shopId,
        amount: amount.toFixed(2),
        bankName: body.bankName,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
      }).returning()
      return { row: created }
    })
    if ("error" in result) return reply.code(400).send({ success: false, error: result.error })
    const row = result.row

    return reply.code(201).send({ success: true, data: row })
  })

  // ── Admin: review withdrawal requests ─────────────────────────────────────
  app.register(async (adminScoped) => {
    adminScoped.addHook("preHandler", requireAdmin)

    adminScoped.get("/", async () => {
      const rows = await db.query.withdrawalRequests.findMany({
        with: { shop: { columns: { name: true, id: true } } },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      })
      return { success: true, data: rows }
    })

    // pending → approved | rejected,  approved → paid | rejected. Anything else is refused, so a
    // rejected or paid request can't be revived (which would silently re-spend or free the money).
    const ALLOWED_FROM: Record<string, ("pending" | "approved")[]> = {
      approved: ["pending"],
      rejected: ["pending", "approved"],
      paid: ["approved"],
    }
    adminScoped.patch("/:id", async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const { id } = request.params as { id: string }
      const { status, note } = (request.body ?? {}) as { status?: string; note?: string }
      if (!status || !(status in ALLOWED_FROM)) {
        return reply.code(400).send({ success: false, error: "สถานะไม่ถูกต้อง" })
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return reply.code(404).send({ success: false, error: "ไม่พบคำขอถอนเงิน" })
      }
      const [updated] = await db.update(withdrawalRequests)
        .set({ status: status as any, processedAt: new Date(), ...(typeof note === "string" ? { note: note.slice(0, 500) } : {}) })
        .where(and(eq(withdrawalRequests.id, id), inArray(withdrawalRequests.status, ALLOWED_FROM[status])))
        .returning()
      if (!updated) {
        const exists = await db.query.withdrawalRequests.findFirst({ where: eq(withdrawalRequests.id, id) })
        return reply.code(exists ? 409 : 404).send({
          success: false,
          error: exists ? `เปลี่ยนจากสถานะ "${exists.status}" เป็น "${status}" ไม่ได้` : "ไม่พบคำขอถอนเงิน",
        })
      }
      await logAdminActivity({ adminId: userId, action: `withdrawal.${status}`, targetType: "withdrawal", targetId: id, details: { shopId: updated.shopId, amount: updated.amount } })
      return { success: true, data: updated }
    })
  })
}
