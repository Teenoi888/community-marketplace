// Regression tests for the P0 payment-security fixes (docs/payso/07-payment-security-audit.md, SEC-01..04).
//
// These run the REAL route code through Fastify's inject() against a REAL Postgres database and local
// mock servers for Xendit / Omise — no network calls leave the machine. Because they create and delete
// rows, point DATABASE_URL at a THROWAWAY database (migrated with `pnpm db:migrate`), never at production:
//
//   DATABASE_URL=postgresql://localhost:5432/p0_payments_test JWT_SECRET=test pnpm --filter @cm/api test:payments
//
// Without DATABASE_URL the suite is skipped.
import { describe, it, before, after, afterEach } from "node:test"
import assert from "node:assert/strict"
import { createHarness, HAS_DB, uniqueId, type Harness } from "./payments.test-harness.js"

describe("payments security (P0)", { skip: !HAS_DB && "DATABASE_URL not set" }, () => {
  let h: Harness
  before(async () => { h = await createHarness() })
  after(async () => { await h.teardown() })
  afterEach(() => h.reset())

  // short aliases so the cases below read like the scenarios they describe
  const { setEnv } = { setEnv: (k: string, v: string | undefined) => h.setEnv(k, v) }
  const call = (...a: Parameters<Harness["call"]>) => h.call(...a)
  const makeOrder = (...a: Parameters<Harness["makeOrder"]>) => h.makeOrder(...a)
  const orderRow = (id: string) => h.orderRow(id)
  const paymentRows = (id: string) => h.paymentRows(id)
  const buyer = () => h.buyerToken
  const other = () => h.otherToken

  // ───────────────────────── SEC-03: ownership ─────────────────────────
  describe("SEC-03 only the buyer can touch an order's payments", () => {
    it("rejects unauthenticated calls", async () => {
      const o = await makeOrder()
      assert.equal((await call("POST", "/promptpay-qr", undefined, { orderId: o.id })).statusCode, 401)
    })

    it("POST / on someone else's order → 404 and no payment row", async () => {
      setEnv("SLIP_PAYMENT_ENABLED", "true")
      const o = await makeOrder()
      const res = await call("POST", "/", other(), { orderId: o.id, method: "bank_transfer", slipUrl: "https://example.com/s.png" })
      assert.equal(res.statusCode, 404)
      assert.equal((await paymentRows(o.id)).length, 0)
    })

    it("/promptpay-qr, /card-session and /card-result on someone else's order → 404", async () => {
      const o = await makeOrder()
      assert.equal((await call("POST", "/promptpay-qr", other(), { orderId: o.id })).statusCode, 404)
      assert.equal((await call("POST", "/card-session", other(), { orderId: o.id })).statusCode, 404)
      assert.equal((await call("GET", `/card-result/${o.id}`, other())).statusCode, 404)
      assert.equal(h.xendit.requests.length, 0, "no gateway call may be made for a non-owner")
    })

    it("owner can read card-result", async () => {
      const o = await makeOrder()
      const res = await call("GET", `/card-result/${o.id}`, buyer())
      assert.equal(res.statusCode, 200)
      assert.equal(res.json().data.orderStatus, "pending_payment")
    })

    it("an already-paid order can't start a new payment", async () => {
      const o = await makeOrder("100.00", "paid")
      assert.equal((await call("POST", "/promptpay-qr", buyer(), { orderId: o.id })).statusCode, 409)
    })
  })

  // ───────────────────────── SEC-04: slips ─────────────────────────
  describe("SEC-04 a slip can never mark an order paid", () => {
    const slip = (orderId: string) => ({ orderId, method: "bank_transfer", slipUrl: "https://example.com/slip.png" })

    it("slip channel is closed by default (403), nothing is written", async () => {
      setEnv("SLIP_PAYMENT_ENABLED", undefined)
      const o = await makeOrder()
      const res = await call("POST", "/", buyer(), slip(o.id))
      assert.equal(res.statusCode, 403)
      assert.equal((await paymentRows(o.id)).length, 0)
      assert.equal((await orderRow(o.id)).status, "pending_payment")
    })

    it("when enabled, a slip is only recorded as `verifying`; the order stays pending_payment", async () => {
      setEnv("SLIP_PAYMENT_ENABLED", "true")
      const o = await makeOrder()
      const res = await call("POST", "/", buyer(), slip(o.id))
      assert.equal(res.statusCode, 201)
      const rows = await paymentRows(o.id)
      assert.equal(rows.length, 1)
      assert.equal(rows[0].status, "verifying")
      assert.equal((await orderRow(o.id)).status, "pending_payment")
    })

    it("a client can't create arbitrary payment rows (needed by forged webhooks) via POST /", async () => {
      setEnv("SLIP_PAYMENT_ENABLED", "true")
      const o = await makeOrder()
      for (const method of ["credit_card", "promptpay", "qr_code"]) {
        const res = await call("POST", "/", buyer(), { orderId: o.id, method })
        assert.equal(res.statusCode, 400, method)
      }
      assert.equal((await paymentRows(o.id)).length, 0)
    })
  })

  // ───────────────────────── SEC-02: amount ─────────────────────────
  describe("SEC-02 the amount to pay is always the order total", () => {
    it("ignores a client-supplied amount when creating the QR", async () => {
      setEnv("XENDIT_SECRET_KEY", "xnd_test")
      const o = await makeOrder("5000.00")
      const res = await call("POST", "/promptpay-qr", buyer(), { orderId: o.id, amount: 1 })
      assert.equal(res.statusCode, 200)
      assert.equal(h.xendit.requests.length, 1)
      assert.equal(h.xendit.requests[0].body.amount, 5000)
      assert.equal(h.xendit.requests[0].body.reference_id, o.id)
    })

    it("fails closed — no placeholder PromptPay number — when Xendit is not configured", async () => {
      setEnv("XENDIT_SECRET_KEY", undefined)
      setEnv("SLIP_PAYMENT_ENABLED", undefined)
      setEnv("PROMPTPAY_ID", undefined)
      const o = await makeOrder()
      const res = await call("POST", "/promptpay-qr", buyer(), { orderId: o.id })
      assert.equal(res.statusCode, 503)
      assert.equal(res.json().error, "promptpay_unavailable")
      assert.ok(!res.body.includes("0812345678"))
    })

    it("legacy static PromptPay needs BOTH the slip flag and a real PROMPTPAY_ID", async () => {
      setEnv("XENDIT_SECRET_KEY", undefined)
      setEnv("SLIP_PAYMENT_ENABLED", "true")
      setEnv("PROMPTPAY_ID", undefined)
      const o = await makeOrder()
      assert.equal((await call("POST", "/promptpay-qr", buyer(), { orderId: o.id })).statusCode, 503)
      setEnv("PROMPTPAY_ID", "0999999999")
      const ok = await call("POST", "/promptpay-qr", buyer(), { orderId: o.id })
      assert.equal(ok.statusCode, 200)
      assert.equal(ok.json().data.amount, 5000)
    })

    describe("Xendit QR webhook", () => {
      const qrEvent = (orderId: string, data: Record<string, unknown> = {}) => ({
        event: "qr.payment",
        data: { id: uniqueId("qrpy_"), reference_id: orderId, status: "COMPLETED", ...data },
      })
      const hook = (payload: any, token = "tok") => call("POST", "/webhook/xendit", undefined, payload, { "x-callback-token": token })

      it("requires the callback token", async () => {
        setEnv("XENDIT_WEBHOOK_TOKEN", "tok")
        const o = await makeOrder()
        assert.equal((await call("POST", "/webhook/xendit", undefined, qrEvent(o.id))).statusCode, 401)
        assert.equal((await hook(qrEvent(o.id), "wrong")).statusCode, 401)
        assert.equal((await orderRow(o.id)).status, "pending_payment")
      })

      it("does NOT mark paid when the reported amount is lower than the order total", async () => {
        setEnv("XENDIT_WEBHOOK_TOKEN", "tok")
        const o = await makeOrder("5000.00")
        const res = await hook(qrEvent(o.id, { amount: 1, currency: "THB" }))
        assert.equal(res.json().success, false)
        assert.equal((await orderRow(o.id)).status, "pending_payment")
        assert.equal((await paymentRows(o.id)).length, 0)
      })

      it("does NOT mark paid when the currency is not THB", async () => {
        setEnv("XENDIT_WEBHOOK_TOKEN", "tok")
        const o = await makeOrder("5000.00")
        await hook(qrEvent(o.id, { amount: 5000, currency: "IDR" }))
        assert.equal((await orderRow(o.id)).status, "pending_payment")
      })

      it("marks paid exactly once when amount and currency match (replay is a no-op)", async () => {
        setEnv("XENDIT_WEBHOOK_TOKEN", "tok")
        const o = await makeOrder("5000.00")
        const ev = qrEvent(o.id, { amount: 5000, currency: "THB" })
        assert.equal((await hook(ev)).json().success, true)
        assert.equal((await orderRow(o.id)).status, "paid")
        await hook(ev) // replay
        assert.equal((await paymentRows(o.id)).length, 1)
      })
    })
  })

  // ───────────────────────── SEC-01: unauthenticated webhooks ─────────────────────────
  describe("SEC-01 unauthenticated gateway callbacks can't mark orders paid", () => {
    it("GB Prime Pay and 2C2P callbacks no longer exist", async () => {
      const o = await makeOrder()
      const gbp = await call("POST", "/webhook/gbpay", undefined, { referenceNo: o.id, resultCode: "00" })
      const c2p = await call("POST", "/webhook/2c2p", undefined, { invoiceNo: o.id.replace(/-/g, "").slice(0, 20), respCode: "0000" })
      assert.equal(gbp.statusCode, 404)
      assert.equal(c2p.statusCode, 404)
      assert.equal((await orderRow(o.id)).status, "pending_payment")
    })

    it("those gateways refuse to start a card payment even if their keys are set", async () => {
      setEnv("OMISE_SECRET_KEY", undefined)
      setEnv("XENDIT_SECRET_KEY", undefined)
      const o = await makeOrder()
      for (const key of ["GBPAY_SECRET_KEY", "TWOC2P_SECRET_KEY"]) {
        setEnv("GBPAY_SECRET_KEY", undefined)
        setEnv("TWOC2P_SECRET_KEY", undefined)
        setEnv(key, "k")
        const res = await call("POST", "/card-session", buyer(), { orderId: o.id })
        assert.equal(res.statusCode, 503, key)
        assert.equal(res.json().error, "payment_gateway_not_enabled", key)
      }
    })

    describe("Omise webhook re-fetches the charge instead of trusting the body", () => {
      const event = (chargeId: string) => ({ key: "charge.complete", data: { id: chargeId, status: "successful" } })
      const goodCharge = (orderId: string, cid: string, over: Record<string, unknown> = {}) => ({
        id: cid, status: "successful", currency: "thb", amount: 500000, metadata: { orderId }, ...over,
      })

      it("a forged 'successful' event for a charge Omise doesn't know → rejected, order untouched", async () => {
        setEnv("OMISE_SECRET_KEY", "skey_test")
        const o = await makeOrder("5000.00")
        const res = await call("POST", "/webhook/omise", undefined, { key: "charge.complete", data: { id: "chrg_test_forged", status: "successful", metadata: { orderId: o.id } } })
        assert.equal(res.statusCode, 502)
        assert.equal((await orderRow(o.id)).status, "pending_payment")
        assert.equal((await paymentRows(o.id)).length, 0)
      })

      it("rejects a malformed charge id and a missing secret key", async () => {
        setEnv("OMISE_SECRET_KEY", "skey_test")
        assert.equal((await call("POST", "/webhook/omise", undefined, event("../../etc/passwd"))).statusCode, 400)
        setEnv("OMISE_SECRET_KEY", undefined)
        assert.equal((await call("POST", "/webhook/omise", undefined, event(uniqueId("chrg_test_")))).statusCode, 503)
      })

      it("does NOT mark paid when the real charge has the wrong amount, status or currency", async () => {
        setEnv("OMISE_SECRET_KEY", "skey_test")
        const o = await makeOrder("5000.00")
        for (const bad of [{ amount: 100 }, { status: "failed" }, { currency: "usd" }]) {
          const cid = uniqueId("chrg_test_") // a fresh charge per variant: the same id would just be de-duplicated
          h.omiseCharges[cid] = goodCharge(o.id, cid, bad)
          await call("POST", "/webhook/omise", undefined, event(cid))
          assert.equal((await orderRow(o.id)).status, "pending_payment", JSON.stringify(bad))
        }
      })

      it("marks paid (once) when Omise confirms a matching successful charge", async () => {
        setEnv("OMISE_SECRET_KEY", "skey_test")
        const o = await makeOrder("5000.00")
        const cid = uniqueId("chrg_test_")
        h.omiseCharges[cid] = goodCharge(o.id, cid)
        assert.equal((await call("POST", "/webhook/omise", undefined, event(cid))).json().success, true)
        assert.equal((await orderRow(o.id)).status, "paid")
        await call("POST", "/webhook/omise", undefined, event(cid)) // replay
        const rows = await paymentRows(o.id)
        assert.equal(rows.length, 1)
        assert.equal(rows[0].reference, cid)
        assert.equal(rows[0].provider, "omise")
        assert.equal(rows[0].providerRef, cid)
        assert.ok(h.omise.requests.every((r) => r.method === "GET"))
      })
    })
  })
})
