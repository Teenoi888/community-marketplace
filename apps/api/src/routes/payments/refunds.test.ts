// Tests for refunds (docs/payso/08-implementation-plan.md, P1-06).
// Same requirements as the other payments tests: a THROWAWAY database built from migrations/*.sql in order.
import { describe, it, before, after, afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { createHarness, HAS_DB, uniqueId, type Harness } from "./payments.test-harness.js"

const address = { name: "t", phone: "t", address: "t", district: "t", subdistrict: "t", province: "t", zipCode: "10000" }

describe("refunds (P1-06)", { skip: !HAS_DB && "DATABASE_URL not set" }, () => {
  let h: Harness
  before(async () => { h = await createHarness() })
  after(async () => { await h.teardown() })
  beforeEach(() => h.setEnv("XENDIT_WEBHOOK_TOKEN", "tok"))
  afterEach(() => h.reset())

  /** a real order, really paid through the webhook */
  async function paidOrder(stock = 10, qty = 2) {
    const p = await h.makeProduct(stock)
    const res = await h.orderCall("POST", "/", h.buyerToken, { shopId: h.shopId, items: [{ productId: p.id, quantity: qty }], deliveryAddress: address })
    const order = res.json().data
    h.trackOrder(order.id)
    const pay = await h.call("POST", "/webhook/xendit", undefined,
      { id: uniqueId("inv_"), external_id: order.id, status: "PAID", amount: Number(order.total), paid_amount: Number(order.total), currency: "THB" },
      { "x-callback-token": "tok" })
    assert.equal(pay.json().outcome, "settled")
    return { p, order }
  }
  const ask = (orderId: string, reason = "ของไม่ตรงปก", token = h.buyerToken) => h.refundCall("POST", "/", token, { orderId, reason })
  const adminPost = (id: string, action: string, body: any = {}) => h.refundCall("POST", `/admin/${id}/${action}`, h.adminToken, body)

  describe("buyer requests", () => {
    it("a paid order can be refunded once; the amount comes from the payment, not the client", async () => {
      const { order } = await paidOrder()
      const res = await h.refundCall("POST", "/", h.buyerToken, { orderId: order.id, reason: "ไม่ต้องการแล้ว", amount: 1 })
      assert.equal(res.statusCode, 201)
      const r = res.json().data
      assert.equal(r.status, "requested")
      assert.equal(Number(r.amount), Number(order.total), "amount is the paid amount, not the client's 1")
      assert.equal(r.requestedBy, h.buyerId)
      assert.equal((await ask(order.id)).statusCode, 409, "a second open request is refused")
      assert.equal((await h.refundRows(order.id)).length, 1)
    })

    it("concurrent requests create exactly one", async () => {
      const { order } = await paidOrder()
      const res = await Promise.all([1, 2, 3, 4].map(() => ask(order.id)))
      assert.equal(res.filter((r) => r.statusCode === 201).length, 1)
      assert.equal((await h.refundRows(order.id)).length, 1)
    })

    it("refused for: someone else's order (404), unpaid order, missing reason, no auth", async () => {
      const { order } = await paidOrder()
      assert.equal((await ask(order.id, "x reason", h.otherToken)).statusCode, 404)
      assert.equal((await h.refundCall("POST", "/", undefined, { orderId: order.id, reason: "abc" })).statusCode, 401)
      assert.equal((await ask(order.id, "")).statusCode, 400)
      const unpaid = await h.makeOrder("100.00")
      assert.equal((await ask(unpaid.id)).statusCode, 409)
      assert.equal((await h.refundRows(unpaid.id)).length, 0)
    })

    it("buyer sees only their own refunds", async () => {
      const { order } = await paidOrder()
      await ask(order.id)
      assert.equal((await h.refundCall("GET", "/", h.buyerToken)).json().data.some((r: any) => r.orderId === order.id), true)
      assert.equal((await h.refundCall("GET", "/", h.otherToken)).json().data.some((r: any) => r.orderId === order.id), false)
    })
  })

  describe("admin workflow", () => {
    it("non-admins can't list or decide (403), unauthenticated is 401", async () => {
      const { order } = await paidOrder()
      const r = (await ask(order.id)).json().data
      assert.equal((await h.refundCall("GET", "/admin", h.buyerToken)).statusCode, 403)
      assert.equal((await h.refundCall("POST", `/admin/${r.id}/approve`, h.buyerToken)).statusCode, 403)
      assert.equal((await h.refundCall("POST", `/admin/${r.id}/approve`, h.otherToken)).statusCode, 403)
      assert.equal((await h.refundCall("GET", "/admin")).statusCode, 401)
      assert.equal((await h.refundRows(order.id))[0].status, "requested")
    })

    it("requested → approved → refunded: payment marked refunded, order cancelled, stock returned, buyer notified", async () => {
      const { p, order } = await paidOrder(10, 2)
      assert.equal((await h.productRow(p.id)).stock, 8)
      const r = (await ask(order.id)).json().data

      assert.equal((await adminPost(r.id, "complete", { providerRefundRef: "re_1" })).statusCode, 409, "can't complete before approval")
      const a = await adminPost(r.id, "approve")
      assert.equal(a.statusCode, 200)
      assert.equal(a.json().data.approvedBy, h.adminId)
      assert.equal((await adminPost(r.id, "approve")).statusCode, 409, "approving twice is refused")

      const missingRef = await adminPost(r.id, "complete", {})
      assert.equal(missingRef.statusCode, 400)
      const done = await adminPost(r.id, "complete", { providerRefundRef: "re_1" })
      assert.equal(done.statusCode, 200)
      assert.equal(done.json().data.status, "refunded")
      assert.equal(done.json().data.providerRefundRef, "re_1")

      assert.equal((await h.paymentRows(order.id))[0].status, "refunded")
      const o = await h.orderRow(order.id)
      assert.equal(o.status, "cancelled")
      assert.equal(o.cancelReason, "refunded")
      assert.equal((await h.productRow(p.id)).stock, 10)
      assert.equal((await h.refundRows(order.id)).length, 1, "completing must not queue another refund")
      assert.equal((await adminPost(r.id, "complete", { providerRefundRef: "re_2" })).statusCode, 409, "can't complete twice")
      assert.equal((await ask(order.id)).statusCode, 409, "nothing left to refund")

      const notes = await h.db.select().from(h.S.notifications).where(eq(h.S.notifications.orderId, order.id))
      assert.ok(notes.some((n) => n.userId === h.buyerId && /คืนเงิน/.test(n.title)))
      const logs = await h.db.select().from(h.S.adminActivityLogs).where(eq(h.S.adminActivityLogs.targetId, r.id))
      assert.deepEqual(logs.map((l) => l.action).sort(), ["refund.approve", "refund.complete"])
    })

    it("reject records the reason and lets the buyer ask again", async () => {
      const { order } = await paidOrder()
      const r = (await ask(order.id)).json().data
      const rej = await adminPost(r.id, "reject", { note: "ใช้งานแล้ว" })
      assert.equal(rej.statusCode, 200)
      assert.equal(rej.json().data.status, "rejected")
      assert.equal(rej.json().data.adminNote, "ใช้งานแล้ว")
      assert.equal((await h.orderRow(order.id)).status, "paid", "a rejected refund leaves the order alone")
      assert.equal((await h.paymentRows(order.id))[0].status, "verified")
      assert.equal((await adminPost(r.id, "approve")).statusCode, 409)
      assert.equal((await ask(order.id)).statusCode, 201)
    })

    it("a delivered order is refunded without being cancelled or touching stock", async () => {
      const { p, order } = await paidOrder(10, 2)
      await h.db.update(h.S.orders).set({ status: "delivered" }).where(eq(h.S.orders.id, order.id))
      const r = (await ask(order.id)).json().data
      await adminPost(r.id, "approve")
      assert.equal((await adminPost(r.id, "complete", { providerRefundRef: "re_9" })).statusCode, 200)
      assert.equal((await h.orderRow(order.id)).status, "delivered")
      assert.equal((await h.productRow(p.id)).stock, 8)
      assert.equal((await h.paymentRows(order.id))[0].status, "refunded")
    })

    it("unknown or malformed ids are 404", async () => {
      assert.equal((await adminPost("not-a-uuid", "approve")).statusCode, 404)
      assert.equal((await adminPost("00000000-0000-4000-8000-000000000000", "approve")).statusCode, 404)
    })

    it("list filters by status", async () => {
      const { order } = await paidOrder()
      const r = (await ask(order.id)).json().data
      const open = (await h.refundCall("GET", "/admin?status=requested", h.adminToken)).json().data
      assert.ok(open.some((x: any) => x.id === r.id && x.buyerName === "Test Buyer"))
      const done = (await h.refundCall("GET", "/admin?status=refunded", h.adminToken)).json().data
      assert.ok(!done.some((x: any) => x.id === r.id))
    })
  })

  describe("a paid order cancelled by the seller queues a refund automatically", () => {
    it("seller cancel → refund request (reason seller_cancelled), stock restored; repeated cancel adds nothing", async () => {
      const { p, order } = await paidOrder(10, 2)
      const res = await h.orderCall("PATCH", `/${order.id}/status`, h.otherToken, { status: "cancelled" })
      assert.equal(res.statusCode, 200)
      const rows = await h.refundRows(order.id)
      assert.equal(rows.length, 1)
      assert.equal(rows[0].status, "requested")
      assert.equal(rows[0].reason, "seller_cancelled")
      assert.equal(rows[0].requestedBy, h.otherId)
      assert.equal((await h.productRow(p.id)).stock, 10)
      await h.orderCall("PATCH", `/${order.id}/status`, h.otherToken, { status: "cancelled" })
      assert.equal((await h.refundRows(order.id)).length, 1)
    })

    it("an unpaid order cancelled by anyone queues no refund", async () => {
      const p = await h.makeProduct(5)
      const { data } = (await h.orderCall("POST", "/", h.buyerToken, { shopId: h.shopId, items: [{ productId: p.id, quantity: 1 }], deliveryAddress: address })).json()
      h.trackOrder(data.id)
      await h.orderCall("POST", `/${data.id}/cancel`, h.buyerToken)
      assert.equal((await h.refundRows(data.id)).length, 0)
    })
  })
})
