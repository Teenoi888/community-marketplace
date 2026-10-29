// Tests for payment integrity (docs/payso/07-payment-security-audit.md, SEC-05 and SEC-06; plan items P1-01..P1-03):
// DB-level uniqueness, atomic + idempotent settlement, and webhook error semantics.
// Same requirements as payments.security.test.ts: a THROWAWAY database built from migrations/*.sql in order.
//
//   DATABASE_URL=postgresql://localhost:5432/payments_test JWT_SECRET=test pnpm --filter @cm/api test:payments
import { describe, it, before, after, afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { createHarness, HAS_DB, uniqueId, type Harness } from "./payments.test-harness.js"

describe("payments integrity (P1)", { skip: !HAS_DB && "DATABASE_URL not set" }, () => {
  let h: Harness
  before(async () => { h = await createHarness() })
  after(async () => { await h.teardown() })
  beforeEach(() => h.setEnv("XENDIT_WEBHOOK_TOKEN", "tok"))
  afterEach(() => h.reset())

  const hook = (payload: unknown, token = "tok") => h.call("POST", "/webhook/xendit", undefined, payload, { "x-callback-token": token })
  const invoice = (orderId: string, over: Record<string, unknown> = {}) =>
    ({ id: uniqueId("inv_"), external_id: orderId, status: "PAID", amount: 5000, paid_amount: 5000, currency: "THB", ...over })
  const qr = (orderId: string, over: Record<string, unknown> = {}) =>
    ({ event: "qr.payment", data: { id: uniqueId("qrpy_"), reference_id: orderId, status: "COMPLETED", amount: 5000, currency: "THB", ...over } })
  const eventsById = (eventId: string) => h.db.select().from(h.S.paymentEvents).where(eq(h.S.paymentEvents.eventId, eventId))
  const insertPayment = (orderId: string, over: Record<string, unknown> = {}) =>
    h.db.insert(h.S.payments).values({ orderId, method: "promptpay", amount: "5000.00", status: "verified", ...over } as any)

  // ───────────────────────── P1-01: schema guards ─────────────────────────
  describe("P1-01 the database itself refuses double settlement", () => {
    it("records provider, provider reference, paid amount, currency and the raw payload", async () => {
      const o = await h.makeOrder("5000.00")
      const inv = invoice(o.id)
      const res = await hook(inv)
      assert.equal(res.json().outcome, "settled")

      const [p] = await h.paymentRows(o.id)
      assert.equal(p.status, "verified")
      assert.equal(p.provider, "xendit")
      assert.equal(p.providerRef, inv.id)
      assert.equal(p.currency, "THB")
      assert.equal(p.paidAmount, "5000.00")
      assert.equal((p.rawPayload as any).external_id, o.id)

      const [e] = await h.eventRows(o.id)
      assert.equal(e.outcome, "settled")
      assert.equal(e.eventType, "invoice.paid")
      assert.equal(e.paymentId, p.id)
      assert.ok(e.processedAt)
    })

    it("refuses two payments with the same (provider, provider_ref)", async () => {
      const a = await h.makeOrder(), b = await h.makeOrder()
      const ref = uniqueId("ref_")
      await insertPayment(a.id, { provider: "xendit", providerRef: ref })
      await assert.rejects(insertPayment(b.id, { provider: "xendit", providerRef: ref }), /unique|duplicate/i)
      await insertPayment(b.id, { provider: "omise", providerRef: ref }) // same ref, other provider: fine
    })

    it("refuses a second VERIFIED payment for one order (but other statuses are fine)", async () => {
      const o = await h.makeOrder()
      await insertPayment(o.id, { status: "verifying", method: "bank_transfer" }) // a slip waiting for review
      await insertPayment(o.id, { status: "verified", provider: "xendit", providerRef: uniqueId("r1_") })
      await assert.rejects(insertPayment(o.id, { status: "verified", provider: "xendit", providerRef: uniqueId("r2_") }), /unique|duplicate/i)
    })

    it("refuses the same (provider, event id) twice in payment_events", async () => {
      const id = uniqueId("evt_")
      const row = { provider: "xendit", eventId: id, eventType: "t", payload: {} }
      await h.db.insert(h.S.paymentEvents).values(row)
      await assert.rejects(h.db.insert(h.S.paymentEvents).values(row), /unique|duplicate/i)
    })
  })

  // ───────────────────────── P1-02: atomic + idempotent settlement ─────────────────────────
  describe("P1-02 settlement is atomic and idempotent", () => {
    it("the same callback delivered 5 times at once → one payment, one event, one 'settled'", async () => {
      const o = await h.makeOrder()
      const inv = invoice(o.id)
      const results = await Promise.all([1, 2, 3, 4, 5].map(() => hook(inv)))
      assert.ok(results.every((r) => r.statusCode === 200))
      const outcomes = results.map((r) => r.json().outcome).sort()
      assert.deepEqual(outcomes, ["duplicate", "duplicate", "duplicate", "duplicate", "settled"])
      assert.equal((await h.paymentRows(o.id)).length, 1)
      assert.equal((await eventsById(`invoice:${inv.id}:PAID`)).length, 1)
      assert.equal((await h.orderRow(o.id)).status, "paid")
    })

    it("PAID then SETTLED for the same invoice is one payment (the second is a harmless duplicate)", async () => {
      const o = await h.makeOrder()
      const inv = invoice(o.id)
      assert.equal((await hook(inv)).json().outcome, "settled")
      const second = await hook({ ...inv, status: "SETTLED" })
      assert.equal(second.json().success, true)
      assert.equal(second.json().outcome, "duplicate")
      assert.equal((await h.paymentRows(o.id)).length, 1)
      assert.equal((await h.eventRows(o.id)).length, 2) // both callbacks are on record
    })

    it("a customer paying twice (two different QR payments): first settles, second is flagged `already_paid`", async () => {
      const o = await h.makeOrder()
      assert.equal((await hook(qr(o.id))).json().outcome, "settled")
      const second = await hook(qr(o.id))
      assert.equal(second.statusCode, 200)
      assert.equal(second.json().success, false)
      assert.equal(second.json().outcome, "already_paid")
      assert.equal((await h.paymentRows(o.id)).length, 1, "the second payment must not create a second 'verified' row")
      const events = await h.eventRows(o.id)
      assert.deepEqual(events.map((e: any) => e.outcome).sort(), ["already_paid", "settled"]) // flagged for a refund
    })

    it("two DIFFERENT payments racing for one order → the row lock lets exactly one settle", async () => {
      const o = await h.makeOrder()
      const [a, b] = await Promise.all([hook(qr(o.id)), hook(qr(o.id))])
      assert.deepEqual([a.json().outcome, b.json().outcome].sort(), ["already_paid", "settled"])
      assert.equal((await h.paymentRows(o.id)).length, 1)
    })

    it("money for a cancelled order is not applied, but is recorded for follow-up", async () => {
      const o = await h.makeOrder("5000.00", "cancelled")
      const res = await hook(qr(o.id))
      assert.equal(res.json().outcome, "order_not_payable")
      assert.equal(res.json().error, "order_status:cancelled")
      assert.equal((await h.orderRow(o.id)).status, "cancelled")
      assert.equal((await h.paymentRows(o.id)).length, 0)
      const [e] = await h.eventRows(o.id)
      assert.equal(e.outcome, "order_not_payable")
    })

    it("a callback for an unknown or malformed order id is answered 200 (no retry storm) and logged", async () => {
      for (const external_id of ["not-a-uuid", "00000000-0000-4000-8000-000000000000"]) {
        const inv = invoice(external_id)
        const res = await hook(inv)
        assert.equal(res.statusCode, 200, external_id)
        assert.equal(res.json().outcome, "order_not_found", external_id)
        const [e] = await eventsById(`invoice:${inv.id}:PAID`)
        assert.equal(e.outcome, "order_not_found")
      }
    })

    it("rejections are recorded with their reason", async () => {
      const o = await h.makeOrder("5000.00")
      const res = await hook(qr(o.id, { amount: 1 }))
      assert.equal(res.json().error, "amount_mismatch")
      const [e] = await h.eventRows(o.id)
      assert.equal(e.outcome, "rejected")
      assert.equal(e.reason, "amount_mismatch")
      assert.equal((await h.paymentRows(o.id)).length, 0)
    })
  })

  // ───────────────────────── P1-03: error semantics ─────────────────────────
  describe("P1-03 webhooks answer 5xx on real failures so the gateway retries", () => {
    it("a database failure → 5xx with NOTHING half-written, and the retry then succeeds", async () => {
      const o = await h.makeOrder("5000.00")
      const inv = invoice(o.id)
      // paid_amount far beyond numeric(12,2): validation passes (it's ≥ the total) but the INSERT fails.
      const failing = await hook({ ...inv, paid_amount: 1e15 })
      assert.equal(failing.statusCode, 500)
      assert.equal((await h.orderRow(o.id)).status, "pending_payment")
      assert.equal((await h.paymentRows(o.id)).length, 0)
      assert.equal((await eventsById(`invoice:${inv.id}:PAID`)).length, 0, "the event row must roll back too, or the retry would be ignored")

      const retry = await hook(inv) // the gateway's retry of the same event
      assert.equal(retry.statusCode, 200)
      assert.equal(retry.json().outcome, "settled")
      assert.equal((await h.orderRow(o.id)).status, "paid")
    })

    it("a bad token is 401 and writes nothing", async () => {
      const o = await h.makeOrder()
      const inv = invoice(o.id)
      assert.equal((await hook(inv, "wrong")).statusCode, 401)
      assert.equal((await eventsById(`invoice:${inv.id}:PAID`)).length, 0)
      assert.equal((await h.orderRow(o.id)).status, "pending_payment")
    })

    it("a payload without a gateway id is 400, not silently accepted", async () => {
      const o = await h.makeOrder()
      assert.equal((await hook({ external_id: o.id, status: "PAID", amount: 5000 })).statusCode, 400)
      assert.equal((await hook({ event: "qr.payment", data: { reference_id: o.id, status: "COMPLETED" } })).statusCode, 400)
      assert.equal((await h.orderRow(o.id)).status, "pending_payment")
    })

    it("events we don't act on are acknowledged (200) without touching anything", async () => {
      const res = await hook({ event: "something.else", data: {} })
      assert.equal(res.statusCode, 200)
      assert.equal(res.json().success, true)
    })
  })
})
