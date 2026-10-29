import { and, eq, isNotNull, lt, sql } from "drizzle-orm"
import { db } from "../db/index.js"
import { orders } from "../db/schema.js"
import { cancelOrder } from "./orders.js"
import { notifyOrderStatus } from "./notify.js"

// Extra time after the deadline before we cancel: a buyer who paid at the last second may have a
// gateway callback still in flight. (A callback that arrives after cancellation is flagged
// order_not_payable for refund by settleOrderPayment.)
export const ORDER_EXPIRY_GRACE_MINUTES = Number(process.env.ORDER_EXPIRY_GRACE_MINUTES ?? 15)

/**
 * Cancel unpaid orders whose payment deadline (+ grace) has passed and give their stock back.
 * Each order is handled in its own transaction and re-checked under the row lock, so a payment that
 * lands between the query and the cancel wins and the order is simply skipped.
 */
export async function expireUnpaidOrders(now = new Date(), graceMinutes = ORDER_EXPIRY_GRACE_MINUTES) {
  const cutoff = new Date(now.getTime() - graceMinutes * 60_000)
  const due = await db.select({ id: orders.id }).from(orders).where(and(
    eq(orders.status, "pending_payment"),
    isNotNull(orders.paymentExpiresAt),
    lt(orders.paymentExpiresAt, cutoff),
  )).limit(200)

  let cancelled = 0
  for (const { id } of due) {
    try {
      const result = await cancelOrder(id, "payment_expired", {
        onlyIf: (o) => o.status === "pending_payment" && !!o.paymentExpiresAt && o.paymentExpiresAt < cutoff,
      })
      if (result.ok && result.changed) {
        cancelled++
        await notifyOrderStatus({
          userId: result.order.buyerId,
          orderId: result.order.id,
          title: `ออเดอร์ #${result.order.id.slice(0, 8).toUpperCase()} — ยกเลิกแล้ว`,
          body: "ออเดอร์ถูกยกเลิกอัตโนมัติเพราะเกินเวลาชำระเงิน",
        }).catch(() => {})
      }
    } catch (e) {
      console.warn(`expire order ${id} failed:`, e)
    }
  }
  return { checked: due.length, cancelled }
}

/** Run the sweep on an interval; a sweep never overlaps the previous one. */
export function startOrderExpiryJob(intervalMs = Number(process.env.ORDER_EXPIRY_SWEEP_MS) || 5 * 60_000) {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const r = await expireUnpaidOrders()
      if (r.cancelled) console.log(`⏱  Expired ${r.cancelled} unpaid order(s)`)
    } catch (e) {
      console.warn("Order expiry sweep error:", e)
    } finally {
      running = false
    }
  }
  void tick()
  return setInterval(tick, intervalMs)
}
