import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "../../db/index.js"
import { orders, payments, refunds, users } from "../../db/schema.js"
import { requireAdmin, requireAuth } from "../../middleware/auth.js"
import { logAdminActivity } from "../../lib/adminLog.js"
import { notifyOrderStatus } from "../../lib/notify.js"
import { cancelOrder } from "../../lib/orders.js"

// Orders a buyer may ask a refund for: money was received and the order is still alive.
// (pending_payment → just cancel it; cancelled → a refund was already queued if money had been taken.)
const REFUNDABLE_ORDER_STATUSES = ["paid", "preparing", "shipped", "delivered"]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const requestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผล").max(500),
})
const noteSchema = z.object({ note: z.string().trim().max(500).optional() })
const completeSchema = z.object({
  providerRefundRef: z.string().trim().min(1, "กรุณาระบุเลขอ้างอิงการคืนเงิน").max(200),
  note: z.string().trim().max(500).optional(),
})

const notFound = { success: false, error: "ไม่พบรายการคืนเงิน" }
const wrongState = { success: false, error: "สถานะของรายการนี้เปลี่ยนไปแล้ว" }

async function tellBuyer(orderId: string, buyerId: string, title: string, body: string) {
  await notifyOrderStatus({ userId: buyerId, orderId, title, body }).catch((e) => console.warn("refund notify failed:", e))
}

export async function refundRoutes(app: FastifyInstance) {

  // ── Buyer: ask for a refund ───────────────────────────────────────────────
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const parsed = requestSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" })
    const { orderId, reason } = parsed.data

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order || order.buyerId !== userId) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })
    if (!REFUNDABLE_ORDER_STATUSES.includes(order.status)) {
      return reply.code(409).send({ success: false, error: "ออเดอร์นี้ขอคืนเงินไม่ได้ในสถานะปัจจุบัน" })
    }
    const [payment] = await db.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "verified")))
    if (!payment) return reply.code(409).send({ success: false, error: "ไม่พบการชำระเงินที่ใช้คืนเงินได้" })

    const [created] = await db.insert(refunds).values({
      orderId, paymentId: payment.id, amount: payment.amount, reason, requestedBy: userId,
    }).onConflictDoNothing().returning()
    if (!created) return reply.code(409).send({ success: false, error: "ออเดอร์นี้มีคำขอคืนเงินที่รอดำเนินการอยู่แล้ว" })
    return reply.code(201).send({ success: true, data: created })
  })

  // ── Buyer: my refund requests (optionally for one order) ──────────────────
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const { orderId } = request.query as { orderId?: string }
    const rows = await db.select({ refund: refunds }).from(refunds)
      .innerJoin(orders, eq(orders.id, refunds.orderId))
      .where(and(eq(orders.buyerId, userId), orderId && UUID_RE.test(orderId) ? eq(refunds.orderId, orderId) : undefined))
      .orderBy(desc(refunds.createdAt))
    return { success: true, data: rows.map((r) => r.refund) }
  })

  // ── Admin ──────────────────────────────────────────────────────────────────
  // Nested plugin so requireAdmin does not leak onto the buyer routes above.
  app.register(async (admin) => {
    admin.addHook("preHandler", requireAdmin)

    admin.get("/admin", async (request) => {
      const { status } = request.query as { status?: string }
      const statuses = status ? status.split(",").filter((s) => ["requested", "approved", "rejected", "refunded"].includes(s)) : []
      const rows = await db.select({
        refund: refunds,
        orderStatus: orders.status,
        orderTotal: orders.total,
        buyerName: users.name,
        buyerPhone: users.phone,
        method: payments.method,
        provider: payments.provider,
        paymentRef: payments.providerRef,
      }).from(refunds)
        .innerJoin(orders, eq(orders.id, refunds.orderId))
        .innerJoin(payments, eq(payments.id, refunds.paymentId))
        .innerJoin(users, eq(users.id, orders.buyerId))
        .where(statuses.length ? inArray(refunds.status, statuses as any) : undefined)
        .orderBy(desc(refunds.createdAt))
        .limit(200)
      return { success: true, data: rows.map(({ refund, ...rest }) => ({ ...refund, ...rest })) }
    })

    // requested → approved
    admin.post("/admin/:id/approve", async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const { id } = request.params as { id: string }
      if (!UUID_RE.test(id)) return reply.code(404).send(notFound)
      const [r] = await db.update(refunds)
        .set({ status: "approved", approvedBy: userId, decidedAt: new Date() })
        .where(and(eq(refunds.id, id), eq(refunds.status, "requested")))
        .returning()
      if (!r) return reply.code((await db.query.refunds.findFirst({ where: eq(refunds.id, id) })) ? 409 : 404).send(wrongState)
      await logAdminActivity({ adminId: userId, action: "refund.approve", targetType: "refund", targetId: id, details: { orderId: r.orderId, amount: r.amount } })
      const order = await db.query.orders.findFirst({ where: eq(orders.id, r.orderId) })
      if (order) await tellBuyer(order.id, order.buyerId, `อนุมัติคืนเงินออเดอร์ #${order.id.slice(0, 8).toUpperCase()}`, "คำขอคืนเงินของคุณได้รับการอนุมัติแล้ว เรากำลังดำเนินการโอนเงินคืน")
      return { success: true, data: r }
    })

    // requested | approved → rejected
    admin.post("/admin/:id/reject", async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const { id } = request.params as { id: string }
      if (!UUID_RE.test(id)) return reply.code(404).send(notFound)
      const body = noteSchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ success: false, error: "ข้อมูลไม่ถูกต้อง" })
      const [r] = await db.update(refunds)
        .set({ status: "rejected", approvedBy: userId, adminNote: body.data.note ?? null, decidedAt: new Date() })
        .where(and(eq(refunds.id, id), inArray(refunds.status, ["requested", "approved"])))
        .returning()
      if (!r) return reply.code((await db.query.refunds.findFirst({ where: eq(refunds.id, id) })) ? 409 : 404).send(wrongState)
      await logAdminActivity({ adminId: userId, action: "refund.reject", targetType: "refund", targetId: id, details: { orderId: r.orderId, note: body.data.note } })
      const order = await db.query.orders.findFirst({ where: eq(orders.id, r.orderId) })
      if (order) await tellBuyer(order.id, order.buyerId, `ไม่อนุมัติคืนเงินออเดอร์ #${order.id.slice(0, 8).toUpperCase()}`, body.data.note ? `เหตุผล: ${body.data.note}` : "คำขอคืนเงินของคุณไม่ได้รับการอนุมัติ")
      return { success: true, data: r }
    })

    // approved → refunded. The admin has returned the money OUTSIDE this system (gateway dashboard / bank
    // transfer) and records the reference here. A not-yet-shipped order is cancelled (stock goes back).
    admin.post("/admin/:id/complete", async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const { id } = request.params as { id: string }
      if (!UUID_RE.test(id)) return reply.code(404).send(notFound)
      const body = completeSchema.safeParse(request.body)
      if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" })

      const current = await db.query.refunds.findFirst({ where: eq(refunds.id, id) })
      if (!current) return reply.code(404).send(notFound)
      if (current.status !== "approved") return reply.code(409).send(wrongState)

      const order = await db.query.orders.findFirst({ where: eq(orders.id, current.orderId) })
      if (order && ["paid", "preparing"].includes(order.status)) {
        // goods never left: cancel the order and return its stock. Safe to repeat if a later step fails.
        await cancelOrder(order.id, "refunded", { actorId: userId })
      }

      const done = await db.transaction(async (tx) => {
        const [r] = await tx.update(refunds)
          .set({ status: "refunded", providerRefundRef: body.data.providerRefundRef, adminNote: body.data.note ?? current.adminNote, refundedAt: new Date() })
          .where(and(eq(refunds.id, id), eq(refunds.status, "approved")))
          .returning()
        if (!r) return null
        await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, r.paymentId))
        return r
      })
      if (!done) return reply.code(409).send(wrongState)

      await logAdminActivity({ adminId: userId, action: "refund.complete", targetType: "refund", targetId: id, details: { orderId: done.orderId, amount: done.amount, ref: done.providerRefundRef } })
      if (order) await tellBuyer(order.id, order.buyerId, `คืนเงินออเดอร์ #${order.id.slice(0, 8).toUpperCase()} แล้ว`, `เราคืนเงิน ฿${Number(done.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ให้คุณแล้ว (อ้างอิง ${done.providerRefundRef})`)
      return { success: true, data: done }
    })
  })
}
