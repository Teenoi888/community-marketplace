import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { withdrawalRequests, shops, orders } from "../../db/schema.js"
import { eq, and, inArray, sql } from "drizzle-orm"
import { requireAuth, requireAdmin } from "../../middleware/auth.js"

const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"] as const

const createWithdrawalSchema = z.object({
  shopId: z.string().uuid(),
  amount: z.number().positive(),
  bankName: z.string().min(2),
  accountName: z.string().min(2),
  accountNumber: z.string().min(4),
})

async function getShopBalance(shopId: string) {
  const [{ revenue }] = await db
    .select({ revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)` })
    .from(orders)
    .where(and(eq(orders.shopId, shopId), inArray(orders.status, PAID_STATUSES as any)))

  const [{ withdrawn }] = await db
    .select({ withdrawn: sql<string>`COALESCE(SUM(${withdrawalRequests.amount}), 0)` })
    .from(withdrawalRequests)
    .where(and(eq(withdrawalRequests.shopId, shopId), inArray(withdrawalRequests.status, ["pending", "approved", "paid"] as any)))

  return Number(revenue) - Number(withdrawn)
}

export async function withdrawalRoutes(app: FastifyInstance) {

  // GET /withdrawals/balance?shopId= — available balance for a seller's shop
  app.get("/balance", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { shopId } = request.query as { shopId?: string }
    if (!shopId) return reply.code(400).send({ success: false, error: "ต้องระบุ shopId" })

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึงร้านนี้" })

    const balance = await getShopBalance(shopId)
    return { success: true, data: { balance: Math.max(0, balance) } }
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
    const body = createWithdrawalSchema.parse(request.body)

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, body.shopId) })
    if (!shop || shop.ownerId !== userId) return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึงร้านนี้" })

    const balance = await getShopBalance(body.shopId)
    if (body.amount > balance) {
      return reply.code(400).send({ success: false, error: `ยอดคงเหลือไม่พอ (คงเหลือ ฿${balance.toLocaleString()})` })
    }

    const [row] = await db.insert(withdrawalRequests).values({
      shopId: body.shopId,
      amount: body.amount.toString(),
      bankName: body.bankName,
      accountName: body.accountName,
      accountNumber: body.accountNumber,
    }).returning()

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

    adminScoped.patch("/:id", async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status } = request.body as { status: "approved" | "rejected" | "paid" }
      if (!["approved", "rejected", "paid"].includes(status)) {
        return reply.code(400).send({ success: false, error: "สถานะไม่ถูกต้อง" })
      }
      const [updated] = await db.update(withdrawalRequests)
        .set({ status, processedAt: new Date() })
        .where(eq(withdrawalRequests.id, id))
        .returning()
      if (!updated) return reply.code(404).send({ success: false, error: "ไม่พบคำขอถอนเงิน" })
      return { success: true, data: updated }
    })
  })
}
