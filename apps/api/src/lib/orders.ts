import { eq, sql } from "drizzle-orm"
import { db } from "../db/index.js"
import { orders, orderItems, products, stockLogs, coupons, couponRedemptions } from "../db/schema.js"

// How long a buyer has to pay before the order is cancelled and its stock goes back on the shelf.
// Keep it >= the gateway invoice duration (Xendit invoices live 3600s, see payments route).
export const ORDER_PAYMENT_TTL_MINUTES = Number(process.env.ORDER_PAYMENT_TTL_MINUTES) || 60

export function newPaymentDeadline(from = new Date()) {
  return new Date(from.getTime() + ORDER_PAYMENT_TTL_MINUTES * 60_000)
}

export type CancelReason = "buyer_cancelled" | "seller_cancelled" | "admin_cancelled" | "payment_expired"

// Statuses an order may be cancelled from. Once it is shipped the goods are gone: that is a
// return/refund (P1-06), not a cancel.
export const CANCELLABLE = ["pending_payment", "paid", "preparing"] as const

export type CancelResult =
  | { ok: true; order: typeof orders.$inferSelect; changed: boolean; stockRestored: boolean }
  | { ok: false; error: "not_found" | "not_cancellable"; status?: string }

/**
 * Cancel an order and give back what it was holding, in ONE transaction:
 *   • the order row is locked (SELECT … FOR UPDATE) — the same lock payment settlement takes, so a
 *     cancel and a payment callback for the same order can't interleave;
 *   • stock is restored only if the order actually reserved it (stock_reserved_at) and only once;
 *   • an unpaid order also releases its coupon use.
 *
 * `onlyIf` lets callers narrow the allowed states further (the buyer endpoint passes
 * pending_payment; the expiry sweep also checks the deadline) against the locked row.
 * Cancelling an already cancelled order is a successful no-op (changed: false).
 */
export async function cancelOrder(
  orderId: string,
  reason: CancelReason,
  opts: { onlyIf?: (order: typeof orders.$inferSelect) => boolean; actorId?: string | null } = {},
): Promise<CancelResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) return { ok: false as const, error: "not_found" as const }
    if (order.status === "cancelled") return { ok: true as const, order, changed: false, stockRestored: false }
    if (!(CANCELLABLE as readonly string[]).includes(order.status) || (opts.onlyIf && !opts.onlyIf(order))) {
      return { ok: false as const, error: "not_cancellable" as const, status: order.status }
    }

    let stockRestored = false
    if (order.stockReservedAt) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id))
      for (const item of items) {
        if (!item.productId) continue
        await tx.update(products)
          .set({
            stock: sql`${products.stock} + ${item.qty}`,
            // a product we sold out because of this reservation becomes buyable again
            status: sql`CASE WHEN ${products.status} = 'out_of_stock' THEN 'active' ELSE ${products.status} END`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId))
        await tx.insert(stockLogs).values({
          productId: item.productId,
          userId: opts.actorId ?? null,
          delta: item.qty,
          reason: reason === "payment_expired" ? "order_expired" : "order_cancelled",
          note: `order ${order.id}`,
        })
        stockRestored = true
      }
    }

    // A coupon use is only given back if the order never got paid.
    if (order.status === "pending_payment") {
      const released = await tx.delete(couponRedemptions)
        .where(eq(couponRedemptions.orderId, order.id))
        .returning({ couponId: couponRedemptions.couponId })
      for (const r of released) {
        await tx.update(coupons)
          .set({ usedCount: sql`GREATEST(0, ${coupons.usedCount} - 1)` })
          .where(eq(coupons.id, r.couponId))
      }
    }

    const now = new Date()
    const [updated] = await tx.update(orders)
      .set({
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: now,
        stockReservedAt: null,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))
      .returning()
    return { ok: true as const, order: updated, changed: true, stockRestored }
  })
}
