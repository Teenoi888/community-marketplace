import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "../../db/index.js"
import { orders, payments, users } from "../../db/schema.js"
import { requireAdmin } from "../../middleware/auth.js"
import { logAdminActivity } from "../../lib/adminLog.js"
import { notifyOrderStatus } from "../../lib/notify.js"
import { notifyPaymentConfirmed } from "../../lib/payments.js"

// Manual review of bank-transfer slips (audit P1-09). A slip only ever creates a `verifying` payment
// (see POST /payments); nothing is paid until an admin looks at the slip and approves it here.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const rejectSchema = z.object({ reason: z.string().trim().min(3, "กรุณาระบุเหตุผล").max(300) })
const approveSchema = z.object({ note: z.string().trim().max(300).optional() }).optional()
const notFound = { success: false, error: "ไม่พบสลิป" }

export async function slipRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin)

  app.get("/", async (request) => {
    const { status } = request.query as { status?: string }
    const wanted = ["verifying", "verified", "failed"].includes(status ?? "") ? (status as "verifying" | "verified" | "failed") : "verifying"
    const rows = await db.select({
      payment: payments,
      orderStatus: orders.status,
      orderTotal: orders.total,
      paymentExpiresAt: orders.paymentExpiresAt,
      buyerName: users.name,
      buyerPhone: users.phone,
      // the same slip image attached to any OTHER payment is a red flag (re-used slip)
      sameSlipElsewhere: sql<number>`(SELECT COUNT(*)::int FROM payments p2 WHERE p2.slip_url = ${payments.slipUrl} AND p2.id <> ${payments.id})`,
    }).from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(users, eq(users.id, orders.buyerId))
      .where(and(eq(payments.method, "bank_transfer"), eq(payments.status, wanted)))
      .orderBy(desc(payments.createdAt))
      .limit(200)
    return {
      success: true,
      data: rows.map(({ payment, ...rest }) => ({
        id: payment.id, orderId: payment.orderId, amount: payment.amount, slipUrl: payment.slipUrl,
        status: payment.status, failedReason: payment.failedReason, createdAt: payment.createdAt, verifiedAt: payment.verifiedAt,
        ...rest,
      })),
    }
  })

  // verifying → verified, order pending_payment → paid. One transaction, order row locked (same lock the
  // gateway settlement takes), so a slip and a gateway payment for the same order can't both succeed.
  app.post("/:id/approve", async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    if (!UUID_RE.test(id)) return reply.code(404).send(notFound)
    if (!approveSchema.safeParse(request.body).success) return reply.code(400).send({ success: false, error: "ข้อมูลไม่ถูกต้อง" })

    const out = await db.transaction(async (tx) => {
      const [slip] = await tx.select().from(payments).where(eq(payments.id, id))
      if (!slip || slip.method !== "bank_transfer") return { code: 404 as const }
      const [order] = await tx.select().from(orders).where(eq(orders.id, slip.orderId)).for("update")
      const [fresh] = await tx.select().from(payments).where(eq(payments.id, id)).for("update")
      if (!order || !fresh) return { code: 404 as const }
      if (fresh.status !== "verifying") return { code: 409 as const, error: "สลิปนี้ถูกตรวจสอบไปแล้ว" }
      if (order.status !== "pending_payment") {
        return { code: 409 as const, error: `ออเดอร์อยู่ในสถานะ "${order.status}" แล้ว อนุมัติสลิปนี้ไม่ได้ — ให้ปฏิเสธสลิปและคืนเงินนอกระบบ` }
      }
      const [already] = await tx.select({ id: payments.id }).from(payments)
        .where(and(eq(payments.orderId, order.id), eq(payments.status, "verified")))
      if (already) return { code: 409 as const, error: "ออเดอร์นี้มีการชำระเงินที่ยืนยันแล้ว" }

      const [verified] = await tx.update(payments).set({
        status: "verified",
        verifiedAt: new Date(),
        provider: "manual_slip",
        providerRef: `slip:${fresh.id}`,
        paidAmount: fresh.amount,
      }).where(eq(payments.id, fresh.id)).returning()
      await tx.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, order.id))
      return { code: 200 as const, payment: verified }
    })

    if (out.code === 404) return reply.code(404).send(notFound)
    if (out.code === 409) return reply.code(409).send({ success: false, error: out.error })

    await logAdminActivity({ adminId: userId, action: "slip.approve", targetType: "payment", targetId: id, details: { orderId: out.payment.orderId, amount: out.payment.amount } })
    await notifyPaymentConfirmed(out.payment.orderId, Number(out.payment.amount)).catch((e) => console.warn("slip approve notify failed:", e))
    return { success: true, data: out.payment }
  })

  // verifying → failed (order stays pending_payment so the buyer can pay again)
  app.post("/:id/reject", async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    if (!UUID_RE.test(id)) return reply.code(404).send(notFound)
    const body = rejectSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" })

    const [rejected] = await db.update(payments)
      .set({ status: "failed", failedReason: body.data.reason })
      .where(and(eq(payments.id, id), eq(payments.method, "bank_transfer"), eq(payments.status, "verifying")))
      .returning()
    if (!rejected) {
      const exists = await db.query.payments.findFirst({ where: and(eq(payments.id, id), eq(payments.method, "bank_transfer")) })
      return reply.code(exists ? 409 : 404).send(exists ? { success: false, error: "สลิปนี้ถูกตรวจสอบไปแล้ว" } : notFound)
    }
    await logAdminActivity({ adminId: userId, action: "slip.reject", targetType: "payment", targetId: id, details: { orderId: rejected.orderId, reason: body.data.reason } })
    const order = await db.query.orders.findFirst({ where: eq(orders.id, rejected.orderId) })
    if (order) {
      await notifyOrderStatus({
        userId: order.buyerId, orderId: order.id,
        title: `สลิปออเดอร์ #${order.id.slice(0, 8).toUpperCase()} ไม่ผ่านการตรวจสอบ`,
        body: `เหตุผล: ${body.data.reason} — กรุณาชำระเงินใหม่อีกครั้ง`,
      }).catch((e) => console.warn("slip reject notify failed:", e))
    }
    return { success: true, data: rejected }
  })
}
