// Tests for manual slip review (docs/payso/08-implementation-plan.md, P1-09).
// Same requirements as the other payments tests: a THROWAWAY database built from migrations/*.sql in order.
import { describe, it, before, after, afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { createHarness, HAS_DB, uniqueId, type Harness } from "./payments.test-harness.js"

describe("slip review (P1-09)", { skip: !HAS_DB && "DATABASE_URL not set" }, () => {
  let h: Harness
  before(async () => { h = await createHarness() })
  after(async () => { await h.teardown() })
  beforeEach(() => { h.setEnv("SLIP_PAYMENT_ENABLED", "true"); h.setEnv("XENDIT_WEBHOOK_TOKEN", "tok") })
  afterEach(() => h.reset())

  /** buyer uploads a slip through the real endpoint → a `verifying` payment */
  async function upload(total = "750.00", slipUrl = `https://img.test/${uniqueId("slip")}.jpg`) {
    const o = await h.makeOrder(total)
    const res = await h.call("POST", "", h.buyerToken, { orderId: o.id, method: "bank_transfer", slipUrl })
    assert.equal(res.statusCode, 201, res.body)
    const [p] = await h.paymentRows(o.id)
    return { o, p, slipUrl }
  }
  const approve = (id: string, token = h.adminToken) => h.slipCall("POST", `/${id}/approve`, token, {})
  const reject = (id: string, reason = "ยอดไม่ตรง") => h.slipCall("POST", `/${id}/reject`, h.adminToken, { reason })

  it("a slip does not pay the order by itself", async () => {
    const { o, p } = await upload()
    assert.equal(p.status, "verifying")
    assert.equal((await h.orderRow(o.id)).status, "pending_payment")
  })

  it("only admins can list or decide", async () => {
    const { p } = await upload()
    for (const t of [h.buyerToken, h.otherToken]) {
      assert.equal((await h.slipCall("GET", "/", t)).statusCode, 403)
      assert.equal((await approve(p.id, t)).statusCode, 403)
      assert.equal((await h.slipCall("POST", `/${p.id}/reject`, t, { reason: "xxx" })).statusCode, 403)
    }
    assert.equal((await h.slipCall("GET", "/")).statusCode, 401)
    assert.equal((await h.paymentRows(p.orderId))[0].status, "verifying")
  })

  it("the queue shows the slip, the buyer and the order total", async () => {
    const { p, slipUrl } = await upload("750.00")
    const rows = (await h.slipCall("GET", "/?status=verifying", h.adminToken)).json().data
    const row = rows.find((r: any) => r.id === p.id)
    assert.ok(row)
    assert.equal(row.slipUrl, slipUrl)
    assert.equal(row.buyerName, "Test Buyer")
    assert.equal(Number(row.orderTotal), 750)
    assert.equal(row.sameSlipElsewhere, 0)
  })

  it("flags a slip image that was attached to another payment", async () => {
    const a = await upload("100.00")
    const b = await upload("200.00", a.slipUrl)
    const rows = (await h.slipCall("GET", "/", h.adminToken)).json().data
    assert.equal(rows.find((r: any) => r.id === a.p.id).sameSlipElsewhere, 1)
    assert.equal(rows.find((r: any) => r.id === b.p.id).sameSlipElsewhere, 1)
  })

  it("approve: payment verified, order paid, buyer + seller notified, audit-logged; second approve is 409", async () => {
    const { o, p } = await upload("750.00")
    const res = await approve(p.id)
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().data.status, "verified")
    assert.equal((await h.orderRow(o.id)).status, "paid")
    const [pay] = await h.paymentRows(o.id)
    assert.equal(pay.provider, "manual_slip")
    assert.equal(pay.providerRef, `slip:${p.id}`)
    assert.equal(Number(pay.paidAmount), 750)
    assert.ok(pay.verifiedAt)
    const notes = await h.db.select().from(h.S.notifications).where(eq(h.S.notifications.orderId, o.id))
    assert.equal(notes.length, 2)
    const logs = await h.db.select().from(h.S.adminActivityLogs).where(eq(h.S.adminActivityLogs.targetId, p.id))
    assert.deepEqual(logs.map((l) => l.action), ["slip.approve"])
    assert.equal((await approve(p.id)).statusCode, 409)
    assert.equal((await h.db.select().from(h.S.notifications).where(eq(h.S.notifications.orderId, o.id))).length, 2)
  })

  it("racing approvals of the same slip: exactly one wins", async () => {
    const { o, p } = await upload()
    const res = await Promise.all([1, 2, 3, 4].map(() => approve(p.id)))
    assert.equal(res.filter((r) => r.statusCode === 200).length, 1)
    assert.equal((await h.paymentRows(o.id)).filter((x) => x.status === "verified").length, 1)
  })

  it("two slips for one order: approving one blocks the other", async () => {
    const o = await h.makeOrder("300.00")
    for (let i = 0; i < 2; i++) await h.call("POST", "", h.buyerToken, { orderId: o.id, method: "bank_transfer", slipUrl: `https://img.test/${uniqueId("s")}.jpg` })
    const [s1, s2] = await h.paymentRows(o.id)
    assert.equal((await approve(s1.id)).statusCode, 200)
    const second = await approve(s2.id)
    assert.equal(second.statusCode, 409)
    assert.equal((await h.paymentRows(o.id)).filter((x) => x.status === "verified").length, 1)
  })

  it("can't approve a slip for a cancelled order (money must be refunded instead)", async () => {
    const { o, p } = await upload()
    await h.db.update(h.S.orders).set({ status: "cancelled" }).where(eq(h.S.orders.id, o.id))
    const res = await approve(p.id)
    assert.equal(res.statusCode, 409)
    assert.equal((await h.orderRow(o.id)).status, "cancelled")
    assert.equal((await h.paymentRows(o.id))[0].status, "verifying")
    assert.equal((await reject(p.id, "ออเดอร์ถูกยกเลิก")).statusCode, 200)
  })

  it("can't approve after the order was already paid through a gateway", async () => {
    const { o, p } = await upload("5000.00")
    const hook = await h.call("POST", "/webhook/xendit", undefined,
      { id: uniqueId("inv_"), external_id: o.id, status: "PAID", amount: 5000, paid_amount: 5000, currency: "THB" }, { "x-callback-token": "tok" })
    assert.equal(hook.json().outcome, "settled")
    assert.equal((await approve(p.id)).statusCode, 409)
    assert.equal((await h.paymentRows(o.id)).filter((x) => x.status === "verified").length, 1)
  })

  it("reject: reason required and stored; order stays payable; buyer notified; can't then approve", async () => {
    const { o, p } = await upload()
    assert.equal((await h.slipCall("POST", `/${p.id}/reject`, h.adminToken, {})).statusCode, 400)
    assert.equal((await reject(p.id, "ยอดไม่ตรง")).statusCode, 200)
    const [pay] = await h.paymentRows(o.id)
    assert.equal(pay.status, "failed")
    assert.equal(pay.failedReason, "ยอดไม่ตรง")
    assert.equal((await h.orderRow(o.id)).status, "pending_payment")
    const notes = await h.db.select().from(h.S.notifications).where(eq(h.S.notifications.orderId, o.id))
    assert.ok(notes.some((n) => n.userId === h.buyerId && /ไม่ผ่าน/.test(n.title)))
    assert.equal((await approve(p.id)).statusCode, 409)
    assert.equal((await reject(p.id)).statusCode, 409)
  })

  it("unknown / malformed ids are 404, and only bank-transfer slips are reachable", async () => {
    assert.equal((await approve("nope")).statusCode, 404)
    assert.equal((await approve("00000000-0000-4000-8000-000000000000")).statusCode, 404)
    const o = await h.makeOrder("100.00")
    const [card] = await h.db.insert(h.S.payments).values({ orderId: o.id, method: "credit_card", amount: "100.00", status: "verifying" } as any).returning()
    assert.equal((await approve(card.id)).statusCode, 404)
    assert.equal((await h.orderRow(o.id)).status, "pending_payment")
  })
})
