import { sql } from "drizzle-orm"
import { db } from "../db/index.js"

// Days a delivered order's money is held before the seller may withdraw it (room for returns/refund requests).
export const WITHDRAWAL_HOLD_DAYS = Number(process.env.WITHDRAWAL_HOLD_DAYS ?? 3)

type Executor = Pick<typeof db, "execute">

export interface ShopBalance {
  /** What the seller can withdraw right now. */
  available: number
  /** Delivered, but still inside the hold period. */
  holding: number
  /** Paid but not delivered yet (preparing / shipped). */
  inProgress: number
  /** Already requested / approved / paid out. */
  withdrawn: number
  holdDays: number
}

/**
 * Seller balance rules (audit P1-07):
 *   • only DELIVERED orders count, and only after the hold period (updated_at is when the order reached `delivered`);
 *   • an order with a refund that is requested, approved or already refunded counts for nothing;
 *   • money already requested / approved / paid out is subtracted (rejected requests are not).
 * Pass a transaction as `exec` to compute inside it.
 */
export async function getShopBalance(shopId: string, exec: Executor = db, now = new Date()): Promise<ShopBalance> {
  const cutoff = new Date(now.getTime() - WITHDRAWAL_HOLD_DAYS * 86_400_000).toISOString()
  const rows = await exec.execute(sql`
    SELECT
      COALESCE(SUM(total) FILTER (WHERE status = 'delivered' AND updated_at <= ${cutoff}::timestamp), 0)::float AS eligible,
      COALESCE(SUM(total) FILTER (WHERE status = 'delivered' AND updated_at >  ${cutoff}::timestamp), 0)::float AS holding,
      COALESCE(SUM(total) FILTER (WHERE status IN ('paid','preparing','shipped')), 0)::float AS in_progress,
      (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawal_requests
         WHERE shop_id = ${shopId} AND status IN ('pending','approved','paid')) AS withdrawn
    FROM (
      SELECT o.total, o.status, o.updated_at
      FROM orders o
      WHERE o.shop_id = ${shopId}
        AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = o.id AND r.status IN ('requested','approved','refunded'))
    ) o
  `)
  const r = (rows as any)[0] ?? (rows as any).rows?.[0]
  const eligible = Number(r.eligible), withdrawn = Number(r.withdrawn)
  return {
    available: Math.max(0, Math.round((eligible - withdrawn) * 100) / 100),
    holding: Number(r.holding),
    inProgress: Number(r.in_progress),
    withdrawn,
    holdDays: WITHDRAWAL_HOLD_DAYS,
  }
}
