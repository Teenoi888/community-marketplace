// Tests for payment-confirmed notifications and the order receipt (docs/payso/08-implementation-plan.md, P1-05).
// Same requirements as the other payments tests: a THROWAWAY database built from migrations/*.sql in order.
import { describe, it, before, after, afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { createHarness, HAS_DB, uniqueId, type Harness } from "./payments.test-harness.js"

describe("payment confirmation & receipt (P1-05)", { skip: !HAS_DB && "DATABASE_URL not set" }, () => {
  let h: Harness
  before(async () => { h = await createHarness() })
  after(async () => { await h.teardown() })
  beforeEach(() => h.setEnv("XENDIT_WEBHOOK_TOKEN", "tok"))
  afterEach(() => h.reset())

  const hook = (payload: unknown) => h.call("POST", "/webhook/xendit", undefined, payload, { "x-callback-token": "tok" })
  const invoice = (orderId: string, over: Record<string, unknown> = {}) =>
    ({ id: uniqueId("inv_"), external_id: orderId, status: "PAID", amount: 5000, paid_amount: 5000, currency: "THB", ...over })
  const notesFor = (orderId: string) => h.db.select().from(h.S.notifications).where(eq(h.S.notifications.orderId, orderId))

  it("buyer and shop owner are each notified once when the payment settles", async () => {
    const o = await h.makeOrder("5000.00")
    assert.equal((await hook(invoice(o.id))).json().outcome, "settled")
    const notes = await notesFor(o.id)
    assert.equal(notes.length, 2)
    const buyer = notes.find((n) => n.userId === h.buyerId)!
    const seller = notes.find((n) => n.userId === h.otherId)!
    assert.match(buyer.title, /ชำระเงินสำเร็จ/)
    assert.match(buyer.body, /5,000\.00/)
    assert.match(seller.title, /ชำระเงินแล้ว/)
    assert.equal(buyer.link, `/orders/${o.id}`)
  })

  it("replays, duplicates, double payments and rejected callbacks send nothing more", async () => {
    const o = await h.makeOrder("5000.00")
    const inv = invoice(o.id)
    await hook(inv)
    await hook(inv)                                           // replay
    await hook({ ...inv, status: "SETTLED" })                 // same invoice, second event
    await hook(invoice(o.id))                                 // second payment → already_paid
    assert.equal((await notesFor(o.id)).length, 2)

    const bad = await h.makeOrder("5000.00")
    await hook(invoice(bad.id, { paid_amount: 1 }))           // underpaid → rejected
    assert.equal((await notesFor(bad.id)).length, 0)
  })

  describe("receipt on GET /orders/:id", () => {
    it("shows reference, amount, method and time once paid — to the buyer and the seller, not to others", async () => {
      const o = await h.makeOrder("5000.00")
      const inv = invoice(o.id)
      await hook(inv)
      for (const token of [h.buyerToken, h.otherToken]) {
        const r = (await h.orderCall("GET", `/${o.id}`, token)).json().data
        assert.equal(r.payment.reference, inv.id)
        assert.equal(r.payment.amount, "5000.00")
        assert.equal(r.payment.method, "credit_card")
        assert.equal(r.payment.provider, "xendit")
        assert.ok(r.payment.paidAt)
        assert.equal(r.payment.rawPayload, undefined, "raw gateway payload must never be exposed")
      }
    })

    it("is null while unpaid", async () => {
      const o = await h.makeOrder("5000.00")
      assert.equal((await h.orderCall("GET", `/${o.id}`, h.buyerToken)).json().data.payment, null)
    })

    it("does not leak to a stranger", async () => {
      const o = await h.makeOrder("5000.00")
      await hook(invoice(o.id))
      const stranger = h.app.jwt.sign({ userId: "00000000-0000-4000-8000-000000000000" })
      assert.equal((await h.orderCall("GET", `/${o.id}`, stranger)).statusCode, 404)
    })
  })
})
