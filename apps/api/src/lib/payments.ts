import { and, eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { orders, payments, paymentEvents, shops } from "../db/schema.js"
import { notifyOrderStatus } from "./notify.js"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Statuses an order has AFTER it was paid (so a second payment for it is a double payment).
const PAID_STATUSES = new Set(["paid", "preparing", "shipped", "delivered"])

export type SettleOutcome =
  | "settled"           // order moved pending_payment → paid
  | "duplicate"         // this event / payment reference was already processed — nothing to do
  | "already_paid"      // order was already paid by a DIFFERENT payment → customer probably paid twice
  | "order_not_payable" // order exists but isn't payable (e.g. cancelled) → money received for an order we can't fulfil
  | "order_not_found"
  | "rejected"          // payload failed validation (amount / currency / …) — nothing was marked paid

export interface SettleInput {
  orderId: string | null | undefined
  provider: string
  /** The gateway's own id for this payment / charge / invoice. Unique per provider. */
  providerRef: string
  method: "promptpay" | "credit_card"
  /** Amount the gateway says was paid (stored in payments.paid_amount). */
  paidAmount?: number | null
  currency?: string | null
  /**
   * Return a reason to reject (nothing is marked paid) or null to accept. Runs inside the
   * transaction against the locked order row, so it can't race with another settlement.
   */
  validate?: (order: typeof orders.$inferSelect) => string | null
  /** When the settlement comes from a gateway callback: logged in payment_events and de-duplicated by id. */
  event?: { id: string; type: string; payload: unknown }
}

export interface SettleResult {
  outcome: SettleOutcome
  reason?: string
  payment?: typeof payments.$inferSelect
}

/**
 * Settles ONE payment against ONE order, atomically and idempotently.
 *
 * Everything happens in a single database transaction:
 *   1. record the callback in payment_events (unique per provider + event id → replays are no-ops),
 *   2. lock the order row (SELECT … FOR UPDATE) so concurrent callbacks for it run one at a time,
 *   3. check it is still pending_payment and the payload is acceptable,
 *   4. insert the payment (unique per provider + provider reference) and mark the order paid.
 *
 * Business outcomes (duplicate, mismatch, cancelled order …) are returned, not thrown, and are
 * committed together with the event row so they stay visible for reconciliation. Anything
 * UNEXPECTED (database down, constraint violation …) throws: the whole transaction — including
 * the event row — rolls back, the caller answers 5xx, and the gateway's retry processes it again.
 */
async function settleInTransaction(input: SettleInput): Promise<SettleResult> {
  return db.transaction(async (tx) => {
    let eventRowId: string | null = null
    if (input.event) {
      // order_id is filled in once we know the order exists (FK), see finish().
      const [row] = await tx.insert(paymentEvents).values({
        provider: input.provider,
        eventId: input.event.id,
        eventType: input.event.type,
        payload: input.event.payload ?? {},
      }).onConflictDoNothing({ target: [paymentEvents.provider, paymentEvents.eventId] }).returning({ id: paymentEvents.id })
      if (!row) return { outcome: "duplicate", reason: "event_already_processed" } as SettleResult
      eventRowId = row.id
    }

    const finish = async (
      outcome: SettleOutcome,
      reason?: string,
      link: { orderId?: string; payment?: typeof payments.$inferSelect } = {},
    ): Promise<SettleResult> => {
      if (eventRowId) {
        await tx.update(paymentEvents).set({
          outcome,
          reason: reason ?? null,
          orderId: link.orderId ?? null,
          paymentId: link.payment?.id ?? null,
          processedAt: new Date(),
        }).where(eq(paymentEvents.id, eventRowId))
      }
      return { outcome, reason, payment: link.payment }
    }

    if (!input.orderId || !UUID_RE.test(input.orderId)) return finish("order_not_found", "invalid_order_id")

    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update")
    if (!order) return finish("order_not_found")

    // Same gateway payment seen again under a different event (e.g. Xendit sends PAID then SETTLED).
    const [existing] = await tx.select().from(payments).where(
      and(eq(payments.provider, input.provider), eq(payments.providerRef, input.providerRef)),
    )
    if (existing) return finish("duplicate", "payment_already_recorded", { orderId: order.id, payment: existing })

    if (order.status !== "pending_payment") {
      return finish(
        PAID_STATUSES.has(order.status) ? "already_paid" : "order_not_payable",
        `order_status:${order.status}`,
        { orderId: order.id },
      )
    }

    const rejection = input.validate?.(order)
    if (rejection) return finish("rejected", rejection, { orderId: order.id })

    const [payment] = await tx.insert(payments).values({
      orderId: order.id,
      method: input.method,
      amount: order.total,
      status: "verified",
      reference: input.providerRef,
      provider: input.provider,
      providerRef: input.providerRef,
      currency: (input.currency ?? "THB").toUpperCase(),
      paidAmount: input.paidAmount != null && Number.isFinite(input.paidAmount) ? String(input.paidAmount) : null,
      verifiedAt: new Date(),
      rawPayload: (input.event?.payload ?? null) as any,
    }).onConflictDoNothing({ target: [payments.provider, payments.providerRef] }).returning()
    if (!payment) return finish("duplicate", "payment_already_recorded", { orderId: order.id })

    await tx.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, order.id))
    return finish("settled", undefined, { orderId: order.id, payment })
  })
}

/** Body for a gateway callback once the business outcome is known (HTTP 200 — retrying wouldn't help). */
export function webhookReply(result: SettleResult) {
  return result.outcome === "settled" || result.outcome === "duplicate"
    ? { success: true, outcome: result.outcome }
    : { success: false, outcome: result.outcome, error: result.reason ?? result.outcome }
}

/** settleInTransaction + the "payment received" notifications, sent only after the transaction has committed. */
export async function settleOrderPayment(input: SettleInput): Promise<SettleResult> {
  const result = await settleInTransaction(input)
  if (result.outcome === "settled" && result.payment) {
    await notifyPaymentConfirmed(result.payment.orderId, Number(result.payment.paidAmount ?? result.payment.amount)).catch((e) =>
      console.warn("payment confirmation notify failed (non-critical):", e),
    )
  }
  return result
}

const NOTIFY_TIMEOUT_MS = 5000

/**
 * Tell the buyer their payment arrived and the shop owner that there is a paid order to prepare.
 * Never throws and never holds the gateway callback for long: a slow email/LINE provider must not
 * make the gateway retry (a retry is harmless — it's a recorded duplicate — but noisy).
 */
export async function notifyPaymentConfirmed(orderId: string, amount: number) {
  const [row] = await db.select({ buyerId: orders.buyerId, ownerId: shops.ownerId })
    .from(orders).innerJoin(shops, eq(shops.id, orders.shopId)).where(eq(orders.id, orderId))
  if (!row) return
  const code = orderId.slice(0, 8).toUpperCase()
  const baht = amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const send = Promise.allSettled([
    notifyOrderStatus({
      userId: row.buyerId, orderId,
      title: `ชำระเงินสำเร็จ — ออเดอร์ #${code}`,
      body: `เราได้รับเงิน ฿${baht} แล้ว ร้านค้ากำลังเตรียมสินค้าให้คุณ`,
    }),
    notifyOrderStatus({
      userId: row.ownerId, orderId,
      title: `💰 ออเดอร์ #${code} ชำระเงินแล้ว`,
      body: `ลูกค้าชำระ ฿${baht} แล้ว กรุณาเตรียมสินค้าและจัดส่ง`,
    }),
  ])
  await Promise.race([send, new Promise((r) => setTimeout(r, NOTIFY_TIMEOUT_MS).unref())])
}
