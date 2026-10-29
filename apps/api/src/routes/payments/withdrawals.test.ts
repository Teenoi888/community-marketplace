// Tests for seller payout rules (docs/payso/08-implementation-plan.md, P1-07).
// Same requirements as the other payments tests: a THROWAWAY database built from migrations/*.sql in order.
//
// NOTE: all test files share one throwaway database but each creates its own shop, and balances are
// per shop, so they can't interfere.
import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { createHarness, HAS_DB, type Harness } from "./payments.test-harness.js"

const bank = { bankName: "KBank", accountName: "Test Shop", accountNumber: "1234567890" }
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000)

describe("seller payouts (P1-07)", { skip: !HAS_DB && "DATABASE_URL not set" }, () => {
  let h: Harness
  before(async () => { h = await createHarness() })
  after(async () => { await h.teardown() })

  /** an order of `total` baht in the given state, last changed `ageDays` ago */
  async function order(total: string, status: "paid" | "preparing" | "shipped" | "delivered" | "cancelled", ageDays = 0) {
    const o = await h.makeOrder(total, "paid")
    await h.db.update(h.S.orders).set({ status, updatedAt: daysAgo(ageDays) }).where(eq(h.S.orders.id, o.id))
    return o
  }
  const balance = async () => (await h.withdrawCall("GET", `/balance?shopId=${h.shopId}`, h.otherToken)).json().data
  const withdraw = (amount: number, token = h.otherToken) => h.withdrawCall("POST", "/", token, { shopId: h.shopId, amount, ...bank })

  it("only delivered orders older than the hold period are withdrawable", async () => {
    await order("1000.00", "paid", 10)
    await order("1000.00", "preparing", 10)
    await order("1000.00", "shipped", 10)
    await order("1000.00", "cancelled", 10)
    await order("500.00", "delivered", 0)     // still held
    await order("200.00", "delivered", 10)    // eligible
    const b = await balance()
    assert.equal(b.available, 200)
    assert.equal(b.holding, 500)
    assert.equal(b.inProgress, 3000)
    assert.equal(b.holdDays, 3)
    assert.equal(b.balance, 200, "legacy `balance` field still present")

    assert.equal((await withdraw(201)).statusCode, 400)
    assert.equal((await withdraw(200)).statusCode, 201)
    assert.equal((await balance()).available, 0)
  })

  it("an order with an open or completed refund is not withdrawable; a rejected refund frees it", async () => {
    const o = await order("300.00", "delivered", 10)
    const [pay] = await h.db.insert(h.S.payments).values({ orderId: o.id, method: "promptpay", amount: "300.00", status: "verified" } as any).returning()
    const before = (await balance()).available
    const [r] = await h.db.insert(h.S.refunds).values({ orderId: o.id, paymentId: pay.id, amount: "300.00", reason: "t" }).returning()
    assert.equal((await balance()).available, before - 300)
    for (const st of ["approved", "refunded"] as const) {
      await h.db.update(h.S.refunds).set({ status: st }).where(eq(h.S.refunds.id, r.id))
      assert.equal((await balance()).available, before - 300)
    }
    await h.db.update(h.S.refunds).set({ status: "rejected" }).where(eq(h.S.refunds.id, r.id))
    assert.equal((await balance()).available, before)
  })

  it("simultaneous requests can't spend the same money twice", async () => {
    await order("1000.00", "delivered", 10)
    const avail = (await balance()).available
    const res = await Promise.all(Array.from({ length: 6 }, () => withdraw(avail)))
    assert.equal(res.filter((r) => r.statusCode === 201).length, 1)
    assert.equal((await balance()).available, 0)
    const rows = await h.db.select().from(h.S.withdrawalRequests).where(eq(h.S.withdrawalRequests.shopId, h.shopId))
    assert.ok(rows.reduce((s, r) => s + Number(r.amount), 0) <= avail + 200 + 1e-6)
  })

  it("a rejected request returns the money to the balance", async () => {
    await order("400.00", "delivered", 10)
    const created = (await withdraw(400)).json().data
    assert.equal((await balance()).available, 0)
    const rej = await h.withdrawCall("PATCH", `/${created.id}`, h.adminToken, { status: "rejected", note: "บัญชีไม่ตรง" })
    assert.equal(rej.statusCode, 200)
    assert.equal((await balance()).available, 400)
  })

  it("only the shop owner can request; amounts must be positive", async () => {
    await order("100.00", "delivered", 10)
    assert.equal((await withdraw(10, h.buyerToken)).statusCode, 403)
    assert.equal((await h.withdrawCall("POST", "/", undefined, { shopId: h.shopId, amount: 10, ...bank })).statusCode, 401)
    assert.equal((await withdraw(0)).statusCode, 400)
    assert.equal((await withdraw(-5)).statusCode, 400)
  })

  describe("admin review follows a state machine", () => {
    const patch = (id: string, status: string) => h.withdrawCall("PATCH", `/${id}`, h.adminToken, { status })
    async function request() {
      await order("50.00", "delivered", 10)
      return (await withdraw(50)).json().data
    }

    it("pending → approved → paid; the audit log records each step", async () => {
      const w = await request()
      assert.equal((await patch(w.id, "paid")).statusCode, 409, "can't pay before approval")
      assert.equal((await patch(w.id, "approved")).statusCode, 200)
      assert.equal((await patch(w.id, "approved")).statusCode, 409)
      assert.equal((await patch(w.id, "paid")).statusCode, 200)
      const logs = await h.db.select().from(h.S.adminActivityLogs).where(eq(h.S.adminActivityLogs.targetId, w.id))
      assert.deepEqual(logs.map((l) => l.action).sort(), ["withdrawal.approved", "withdrawal.paid"])
    })

    it("a rejected or paid request can't be revived", async () => {
      const w = await request()
      await patch(w.id, "rejected")
      for (const st of ["approved", "paid", "rejected"]) assert.equal((await patch(w.id, st)).statusCode, 409, st)
      const w2 = await request()
      await patch(w2.id, "approved"); await patch(w2.id, "paid")
      for (const st of ["approved", "rejected", "paid"]) assert.equal((await patch(w2.id, st)).statusCode, 409, st)
    })

    it("non-admins are refused; bad status 400; unknown id 404", async () => {
      const w = await request()
      assert.equal((await h.withdrawCall("PATCH", `/${w.id}`, h.otherToken, { status: "approved" })).statusCode, 403)
      assert.equal((await patch(w.id, "bogus")).statusCode, 400)
      assert.equal((await patch("00000000-0000-4000-8000-000000000000", "approved")).statusCode, 404)
      assert.equal((await patch("nope", "approved")).statusCode, 404)
    })
  })
})
