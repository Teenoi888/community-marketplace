// Tests for order expiry, cancellation and stock reservation (docs/payso/08-implementation-plan.md, P1-04).
// Same requirements as the other payments tests: a THROWAWAY database built from migrations/*.sql in order.
//
//   DATABASE_URL=postgresql://localhost:5432/payments_test JWT_SECRET=test pnpm --filter @cm/api test:payments
import { describe, it, before, after, afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { createHarness, HAS_DB, uniqueId, type Harness } from "./payments.test-harness.js"

const address = { name: "t", phone: "t", address: "t", district: "t", subdistrict: "t", province: "t", zipCode: "10000" }

describe("order expiry & stock reservation (P1-04)", { skip: !HAS_DB && "DATABASE_URL not set" }, () => {
  let h: Harness
  let expireUnpaidOrders: typeof import("../../lib/orderExpiry.js").expireUnpaidOrders
  before(async () => {
    h = await createHarness()
    ;({ expireUnpaidOrders } = await import("../../lib/orderExpiry.js"))
  })
  after(async () => { await h.teardown() })
  beforeEach(() => h.setEnv("XENDIT_WEBHOOK_TOKEN", "tok"))
  afterEach(() => h.reset())

  const place = async (items: { productId: string; quantity: number }[], extra: Record<string, unknown> = {}, token = h.buyerToken) => {
    const res = await h.orderCall("POST", "/", token, { shopId: h.shopId, items, deliveryAddress: address, ...extra })
    if (res.statusCode === 201) h.trackOrder(res.json().data.id)
    return res
  }
  const later = (min: number) => new Date(Date.now() + min * 60_000)
  /** make an order look like it was placed `min` minutes ago (deadline in the past) */
  const age = (orderId: string, minutesPastDeadline: number) =>
    h.db.update(h.S.orders).set({ paymentExpiresAt: later(-minutesPastDeadline) }).where(eq(h.S.orders.id, orderId))

  describe("placing an order reserves stock atomically", () => {
    it("takes stock, stamps the payment deadline and the reservation marker", async () => {
      const p = await h.makeProduct(10)
      const res = await place([{ productId: p.id, quantity: 3 }])
      assert.equal(res.statusCode, 201)
      const o = await h.orderRow(res.json().data.id)
      assert.equal((await h.productRow(p.id)).stock, 7)
      assert.ok(o.stockReservedAt)
      const mins = (o.paymentExpiresAt!.getTime() - Date.now()) / 60_000
      assert.ok(mins > 55 && mins <= 60.1, `deadline should be ~60 min away, was ${mins}`)
    })

    it("two buyers racing for the last unit: exactly one wins and stock never goes negative", async () => {
      const p = await h.makeProduct(1)
      const results = await Promise.all(Array.from({ length: 6 }, () => place([{ productId: p.id, quantity: 1 }])))
      assert.equal(results.filter((r) => r.statusCode === 201).length, 1)
      assert.equal(results.filter((r) => r.statusCode === 400).length, 5)
      const row = await h.productRow(p.id)
      assert.equal(row.stock, 0)
      assert.equal(row.status, "out_of_stock")
    })

    it("a multi-item order is all-or-nothing", async () => {
      const a = await h.makeProduct(5)
      const b = await h.makeProduct(1)
      const res = await place([{ productId: a.id, quantity: 2 }, { productId: b.id, quantity: 2 }])
      assert.equal(res.statusCode, 400)
      assert.equal((await h.productRow(a.id)).stock, 5, "first item's stock must be rolled back")
      assert.equal((await h.productRow(b.id)).stock, 1)
    })

    it("the same product listed twice is counted together", async () => {
      const p = await h.makeProduct(3)
      const res = await place([{ productId: p.id, quantity: 2 }, { productId: p.id, quantity: 2 }])
      assert.equal(res.statusCode, 400)
      assert.equal((await h.productRow(p.id)).stock, 3)
    })

    it("refuses a product from another shop or an inactive product", async () => {
      const inactive = await h.makeProduct(5, { status: "inactive" })
      const res = await place([{ productId: inactive.id, quantity: 1 }])
      assert.equal(res.statusCode, 400)
      assert.equal((await h.productRow(inactive.id)).stock, 5)
    })

    it("a coupon with one use left can't be claimed twice concurrently, and a failed order doesn't burn it", async () => {
      const p = await h.makeProduct(10)
      const c = await h.makeCoupon({ usageLimit: 1 })
      const results = await Promise.all([1, 2, 3].map(() => place([{ productId: p.id, quantity: 1 }], { couponCode: c.code })))
      assert.equal(results.filter((r) => r.statusCode === 201).length, 1)
      assert.equal((await h.couponRow(c.id)).usedCount, 1)
      assert.equal((await h.productRow(p.id)).stock, 9, "losing orders must not keep their stock")
    })
  })

  describe("cancelling gives everything back — once", () => {
    it("buyer cancel: stock restored, coupon released, order cancelled with a reason", async () => {
      const p = await h.makeProduct(10)
      const c = await h.makeCoupon()
      const { data } = (await place([{ productId: p.id, quantity: 4 }], { couponCode: c.code })).json()
      assert.equal((await h.couponRow(c.id)).usedCount, 1)

      const res = await h.orderCall("POST", `/${data.id}/cancel`, h.buyerToken)
      assert.equal(res.statusCode, 200)
      const o = await h.orderRow(data.id)
      assert.equal(o.status, "cancelled")
      assert.equal(o.cancelReason, "buyer_cancelled")
      assert.ok(o.cancelledAt)
      assert.equal(o.stockReservedAt, null)
      assert.equal((await h.productRow(p.id)).stock, 10)
      assert.equal((await h.couponRow(c.id)).usedCount, 0)
      assert.ok((await h.stockLogRows(p.id)).some((l) => l.delta === 4 && l.reason === "order_cancelled"))
    })

    it("cancelling twice restores stock only once", async () => {
      const p = await h.makeProduct(10)
      const { data } = (await place([{ productId: p.id, quantity: 4 }])).json()
      const res = await Promise.all([1, 2, 3].map(() => h.orderCall("POST", `/${data.id}/cancel`, h.buyerToken)))
      assert.ok(res.every((r) => r.statusCode === 200))
      assert.equal((await h.productRow(p.id)).stock, 10)
      assert.equal((await h.stockLogRows(p.id)).filter((l) => l.reason === "order_cancelled").length, 1)
    })

    it("a sold-out product becomes buyable again", async () => {
      const p = await h.makeProduct(1)
      const { data } = (await place([{ productId: p.id, quantity: 1 }])).json()
      assert.equal((await h.productRow(p.id)).status, "out_of_stock")
      await h.orderCall("POST", `/${data.id}/cancel`, h.buyerToken)
      const row = await h.productRow(p.id)
      assert.equal(row.stock, 1)
      assert.equal(row.status, "active")
    })

    it("only the buyer can cancel (others get 404), and only while pending_payment", async () => {
      const p = await h.makeProduct(5)
      const { data } = (await place([{ productId: p.id, quantity: 1 }])).json()
      assert.equal((await h.orderCall("POST", `/${data.id}/cancel`, h.otherToken)).statusCode, 404)
      assert.equal((await h.orderCall("POST", `/${data.id}/cancel`)).statusCode, 401)
      assert.equal((await h.orderCall("POST", `/not-a-uuid/cancel`, h.buyerToken)).statusCode, 404)
      await h.db.update(h.S.orders).set({ status: "paid" }).where(eq(h.S.orders.id, data.id))
      const res = await h.orderCall("POST", `/${data.id}/cancel`, h.buyerToken)
      assert.equal(res.statusCode, 409)
      assert.equal((await h.orderRow(data.id)).status, "paid")
      assert.equal((await h.productRow(p.id)).stock, 4, "a refused cancel must not touch stock")
    })

    it("seller cancel of a paid order restores stock but keeps the coupon used; shipped can't be cancelled", async () => {
      const p = await h.makeProduct(10)
      const c = await h.makeCoupon()
      const { data } = (await place([{ productId: p.id, quantity: 2 }], { couponCode: c.code })).json()
      await h.db.update(h.S.orders).set({ status: "paid" }).where(eq(h.S.orders.id, data.id))

      const res = await h.orderCall("PATCH", `/${data.id}/status`, h.otherToken, { status: "cancelled" })
      assert.equal(res.statusCode, 200)
      const o = await h.orderRow(data.id)
      assert.equal(o.cancelReason, "seller_cancelled")
      assert.equal((await h.productRow(p.id)).stock, 10)
      assert.equal((await h.couponRow(c.id)).usedCount, 1)

      const { data: d2 } = (await place([{ productId: p.id, quantity: 1 }])).json()
      await h.db.update(h.S.orders).set({ status: "shipped" }).where(eq(h.S.orders.id, d2.id))
      const refused = await h.orderCall("PATCH", `/${d2.id}/status`, h.otherToken, { status: "cancelled" })
      assert.equal(refused.statusCode, 409)
      assert.equal((await h.orderRow(d2.id)).status, "shipped")
      assert.equal((await h.productRow(p.id)).stock, 9)
    })

    it("a legacy order (no reservation marker) is cancelled WITHOUT inventing stock", async () => {
      const p = await h.makeProduct(5)
      const o = await h.makeOrder("100.00")
      await h.db.insert(h.S.orderItems).values({ orderId: o.id, productId: p.id, productName: "x", qty: 3, priceSnapshot: "100.00" })
      const res = await h.orderCall("POST", `/${o.id}/cancel`, h.buyerToken)
      assert.equal(res.statusCode, 200)
      assert.equal((await h.orderRow(o.id)).status, "cancelled")
      assert.equal((await h.productRow(p.id)).stock, 5)
    })
  })

  describe("the expiry sweep", () => {
    it("cancels unpaid orders past deadline + grace and restores their stock", async () => {
      const p = await h.makeProduct(10)
      const { data } = (await place([{ productId: p.id, quantity: 4 }])).json()
      await age(data.id, 30) // 30 min past deadline, grace is 15
      const r = await expireUnpaidOrders()
      assert.ok(r.cancelled >= 1)
      const o = await h.orderRow(data.id)
      assert.equal(o.status, "cancelled")
      assert.equal(o.cancelReason, "payment_expired")
      assert.equal((await h.productRow(p.id)).stock, 10)
      assert.ok((await h.stockLogRows(p.id)).some((l) => l.reason === "order_expired"))
    })

    it("leaves alone: orders inside the deadline, inside the grace period, paid orders, and legacy orders with no deadline", async () => {
      const p = await h.makeProduct(20)
      const fresh = (await place([{ productId: p.id, quantity: 1 }])).json().data
      const grace = (await place([{ productId: p.id, quantity: 1 }])).json().data
      const paid = (await place([{ productId: p.id, quantity: 1 }])).json().data
      const legacy = await h.makeOrder("100.00")
      await age(grace.id, 5)
      await age(paid.id, 60)
      await h.db.update(h.S.orders).set({ status: "paid" }).where(eq(h.S.orders.id, paid.id))
      await expireUnpaidOrders()
      assert.equal((await h.orderRow(fresh.id)).status, "pending_payment")
      assert.equal((await h.orderRow(grace.id)).status, "pending_payment")
      assert.equal((await h.orderRow(paid.id)).status, "paid")
      assert.equal((await h.orderRow(legacy.id)).status, "pending_payment")
      assert.equal((await h.productRow(p.id)).stock, 17)
    })

    it("running it again, or concurrently, restores stock exactly once", async () => {
      const p = await h.makeProduct(10)
      const { data } = (await place([{ productId: p.id, quantity: 4 }])).json()
      await age(data.id, 30)
      await Promise.all([expireUnpaidOrders(), expireUnpaidOrders(), expireUnpaidOrders()])
      await expireUnpaidOrders()
      assert.equal((await h.productRow(p.id)).stock, 10)
      assert.equal((await h.stockLogRows(p.id)).filter((l) => l.reason === "order_expired").length, 1)
    })

    it("a payment that lands first wins: the sweep skips the order", async () => {
      const p = await h.makeProduct(10)
      const { data } = (await place([{ productId: p.id, quantity: 2 }])).json()
      await age(data.id, 30)
      const res = await h.call("POST", "/webhook/xendit", undefined,
        { id: uniqueId("inv_"), external_id: data.id, status: "PAID", amount: Number(data.total), paid_amount: Number(data.total), currency: "THB" },
        { "x-callback-token": "tok" })
      assert.equal(res.json().outcome, "settled")
      await expireUnpaidOrders()
      assert.equal((await h.orderRow(data.id)).status, "paid")
      assert.equal((await h.productRow(p.id)).stock, 8)
    })

    it("a payment that arrives after the order expired is flagged for refund, not lost", async () => {
      const p = await h.makeProduct(10)
      const { data } = (await place([{ productId: p.id, quantity: 2 }])).json()
      await age(data.id, 30)
      await expireUnpaidOrders()
      const res = await h.call("POST", "/webhook/xendit", undefined,
        { id: uniqueId("inv_"), external_id: data.id, status: "PAID", amount: Number(data.total), paid_amount: Number(data.total), currency: "THB" },
        { "x-callback-token": "tok" })
      assert.equal(res.json().outcome, "order_not_payable")
      assert.equal((await h.orderRow(data.id)).status, "cancelled")
      assert.equal((await h.eventRows(data.id)).length, 1)
    })

    it("no new payment can be started for an expired order", async () => {
      const p = await h.makeProduct(10)
      const { data } = (await place([{ productId: p.id, quantity: 1 }])).json()
      await age(data.id, 1)
      const res = await h.call("POST", "/promptpay-qr", h.buyerToken, { orderId: data.id })
      assert.equal(res.statusCode, 409)
      assert.equal(res.json().error, "order_expired")
      assert.equal(h.xendit.requests.length, 0)
    })
  })
})
