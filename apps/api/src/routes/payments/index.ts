import type { FastifyInstance } from "fastify"
import { z } from "zod"
import axios from "axios"
import QRCode from "qrcode"
import { db } from "../../db/index.js"
import { payments, orders } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["promptpay", "qr_code", "bank_transfer", "credit_card"]),
  slipUrl: z.string().url().optional(),
})

// ─── Authorization ───────────────────────────────────────────────────────────
// Only the buyer of an order may create or read payments for it.
// Returns null (→ 404, not 403) for other people's orders so order IDs can't be probed.
async function getBuyerOrder(userId: string, orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order || order.buyerId !== userId) return null
  return order
}

const orderNotFound = { success: false, error: "ไม่พบออเดอร์" }
const orderNotPayable = { success: false, error: "ออเดอร์นี้ไม่ได้อยู่ในสถานะรอชำระเงิน" }

// Slip / manual-PromptPay payments are CLOSED by default: the slip check only compared the
// amount, so one real slip could settle many orders. When enabled (SLIP_PAYMENT_ENABLED=true)
// a slip only records a `verifying` payment — it never marks the order paid by itself.
const slipPaymentEnabled = () => process.env.SLIP_PAYMENT_ENABLED === "true"

// Omise API base (override only for local testing with a mock server)
const OMISE_API_BASE = process.env.OMISE_API_BASE || "https://api.omise.co"

// ─── Detect which card gateway is configured ─────────────────────────────────
function detectCardGateway(): "omise" | "xendit" | "gbprimepay" | "2c2p" | null {
  if (process.env.OMISE_SECRET_KEY)       return "omise"
  // Xendit key ใช้กับ PromptPay QR เสมอ แต่ช่องทางบัตรต้องเปิดแยก (หลัง Xendit อนุมัติ channel บัตรแล้ว)
  if (process.env.XENDIT_SECRET_KEY && process.env.XENDIT_CARD_ENABLED === "true") return "xendit"
  if (process.env.GBPAY_SECRET_KEY)       return "gbprimepay"
  if (process.env.TWOC2P_SECRET_KEY)      return "2c2p"
  return null
}

// ─── Xendit API base (override only for local testing with a mock server) ─────
const XENDIT_API_BASE = process.env.XENDIT_API_BASE || "https://api.xendit.co"

// ─── Xendit Basic Auth header ─────────────────────────────────────────────────
function xenditAuth() {
  return `Basic ${Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString("base64")}`
}

export async function paymentRoutes(app: FastifyInstance) {

  // ── Slip upload (manual transfer) ─────────────────────────────────────────
  // Closed by default (SLIP_PAYMENT_ENABLED). Even when enabled, a slip is only recorded as
  // `verifying` — a person must confirm it; it is never auto-marked paid (see slipPaymentEnabled).
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const parsed = createPaymentSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: "ข้อมูลไม่ถูกต้อง" })
    const body = parsed.data

    const order = await getBuyerOrder(userId, body.orderId)
    if (!order) return reply.code(404).send(orderNotFound)
    if (order.status !== "pending_payment") return reply.code(409).send(orderNotPayable)

    if (body.method !== "bank_transfer" || !body.slipUrl) {
      // Other methods are created through /promptpay-qr and /card-session and are confirmed
      // only by verified gateway webhooks — never by a client-created payment row.
      return reply.code(400).send({ success: false, error: "ช่องทางนี้ต้องชำระผ่านหน้าชำระเงินของระบบ" })
    }
    if (!slipPaymentEnabled()) {
      return reply.code(403).send({
        success: false,
        error: "slip_payment_disabled",
        message: "ไม่รับชำระเงินด้วยการอัปโหลดสลิปในขณะนี้ กรุณาเลือกช่องทางอื่น",
      })
    }

    const [payment] = await db.insert(payments).values({
      orderId: order.id,
      method: "bank_transfer",
      amount: order.total,
      status: "verifying",
      slipUrl: body.slipUrl,
    }).returning()

    return reply.code(201).send({ success: true, data: payment, message: "ได้รับสลิปแล้ว รอทีมงานตรวจสอบ" })
  })

  // ── PromptPay QR (Xendit) ────────────────────────────────────────────────
  app.post("/promptpay-qr", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    // `amount` from the client (if any) is deliberately ignored — the amount to pay is always
    // the order total stored in the database, otherwise a buyer could request a 1-baht QR.
    const parsed = z.object({ orderId: z.string().uuid() }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: "ข้อมูลไม่ถูกต้อง" })
    const { orderId } = parsed.data

    const order = await getBuyerOrder(userId, orderId)
    if (!order) return reply.code(404).send(orderNotFound)
    if (order.status !== "pending_payment") return reply.code(409).send(orderNotPayable)
    const amount = Number(order.total)

    if (process.env.XENDIT_SECRET_KEY) {
      try {
        const res = await axios.post(
          `${XENDIT_API_BASE}/qr_codes`,
          {
            external_id: orderId,
            reference_id: orderId,
            type: "DYNAMIC",
            currency: "THB",
            amount,
            callback_url: `${process.env.API_URL}/api/payments/webhook/xendit`,
          },
          { headers: { Authorization: xenditAuth() } }
        )
        const d = res.data
        if (d.qr_string) {
          // Convert EMVCo QR string → base64 PNG image for frontend
          const qrImage = await QRCode.toDataURL(d.qr_string, { width: 260, margin: 2 })
          return {
            success: true,
            data: { qrImage, xenditId: d.id },
          }
        }
      } catch (e: any) {
        app.log.warn({ err: e?.response?.data || e?.message }, "Xendit QR request failed")
      }
    }

    // Legacy manual flow (static PromptPay ID + slip): only when explicitly enabled AND a real
    // PROMPTPAY_ID is configured. There is no placeholder default any more — customers must
    // never be shown a sample number — so this fails closed.
    if (slipPaymentEnabled() && process.env.PROMPTPAY_ID) {
      return { success: true, data: { promptpayId: process.env.PROMPTPAY_ID, amount, orderId } }
    }

    return reply.code(503).send({
      success: false,
      error: "promptpay_unavailable",
      message: "ช่องทาง PromptPay ยังไม่พร้อมให้บริการ กรุณาลองใหม่ภายหลังหรือติดต่อทีมงาน",
    })
  })

  // ── Card Payment Session ─────────────────────────────────────────────────
  // รองรับ Omise และ Xendit (hosted invoice) — ใส่ key ใน Railway env vars แล้วระบบจะเชื่อมทันที
  // (GB Prime Pay / 2C2P ถูกปิดไว้จนกว่าจะมีการตรวจลายเซ็น callback)
  app.post("/card-session", { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      orderId: z.string().uuid(),
      // Omise: ส่ง token จาก Omise.js (frontend tokenization)
      omiseToken: z.string().optional(),
    })
    const { userId } = request.user as { userId: string }
    const parsed = schema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: "ข้อมูลไม่ถูกต้อง" })
    const body = parsed.data
    const order = await getBuyerOrder(userId, body.orderId)
    if (!order) return reply.code(404).send(orderNotFound)
    if (order.status !== "pending_payment") return reply.code(409).send(orderNotPayable)

    const gateway = detectCardGateway()

    // GB Prime Pay and 2C2P confirm payment through a server callback that this API does not
    // yet authenticate (their handlers were removed: they let anyone mark an order paid).
    // Refuse to start a payment on them until signature verification is implemented.
    if (gateway === "gbprimepay" || gateway === "2c2p") {
      return reply.code(503).send({
        success: false,
        error: "payment_gateway_not_enabled",
        message: "ช่องทางชำระด้วยบัตรนี้ยังไม่เปิดให้บริการ",
      })
    }

    // ── Omise ──────────────────────────────────────────────────────────────
    if (gateway === "omise" && body.omiseToken) {
      try {
        const chargeRes = await axios.post(
          "https://api.omise.co/charges",
          {
            amount: Math.round(Number(order.total) * 100), // satang
            currency: "thb",
            card: body.omiseToken,
            metadata: { orderId: order.id },
            return_uri: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/${order.id}/card-result`,
          },
          {
            auth: { username: process.env.OMISE_SECRET_KEY!, password: "" },
          }
        )
        const charge = chargeRes.data
        // If requires 3DS redirect
        if (charge.authorize_uri) {
          return { success: true, data: { gateway: "omise", redirectUrl: charge.authorize_uri, chargeId: charge.id } }
        }
        // Immediate success
        if (charge.status === "successful") {
          const [payment] = await db.insert(payments).values({
            orderId: order.id, method: "credit_card", amount: order.total, status: "verified",
            reference: charge.id, verifiedAt: new Date(),
          }).returning()
          await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, order.id))
          return { success: true, data: { gateway: "omise", payment, verified: true } }
        }
        return reply.code(402).send({ success: false, error: `การชำระล้มเหลว: ${charge.failure_message}` })
      } catch (err: any) {
        app.log.error(err?.response?.data || err)
        return reply.code(500).send({ success: false, error: "Omise charge failed" })
      }
    }

    // ── Xendit (Hosted Invoice page — card data never touches our server) ──
    if (gateway === "xendit") {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        const res = await axios.post(
          `${XENDIT_API_BASE}/v2/invoices`,
          {
            external_id: order.id,
            amount: Number(order.total),
            currency: "THB",
            description: `ตลาดชุมชน — ออเดอร์ #${order.id.slice(0, 8).toUpperCase()}`,
            invoice_duration: 3600,
            payment_methods: ["CREDIT_CARD"],
            success_redirect_url: `${appUrl}/checkout/${order.id}`,
            failure_redirect_url: `${appUrl}/checkout/${order.id}`,
          },
          { headers: { Authorization: xenditAuth() } }
        )
        return { success: true, data: { gateway: "xendit", redirectUrl: res.data.invoice_url, invoiceId: res.data.id } }
      } catch (err: any) {
        app.log.error(err?.response?.data || err)
        return reply.code(500).send({ success: false, error: "Xendit invoice failed" })
      }
    }

    // ── No gateway configured ───────────────────────────────────────────────
    return reply.code(503).send({
      success: false,
      error: "payment_gateway_not_configured",
      message: "ยังไม่ได้เชื่อมต่อ Payment Gateway สำหรับบัตร — กรุณาตั้งค่า OMISE_SECRET_KEY หรือ XENDIT_SECRET_KEY + XENDIT_CARD_ENABLED=true ใน environment variables",
      supportedGateways: ["omise", "xendit"],
    })
  })

  // ── Card payment result (after 3DS redirect) ────────────────────────────
  app.get("/card-result/:orderId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { orderId } = request.params as { orderId: string }

    // Check order status from DB (webhook should have updated it already)
    const order = await getBuyerOrder(userId, orderId)
    if (!order) return reply.code(404).send(orderNotFound)

    return { success: true, data: { orderId, orderStatus: order.status, verified: order.status === "paid" } }
  })

  // ── Gateway info (for frontend to know which gateway is active) ───────────
  app.get("/gateway-info", async () => {
    const gateway = detectCardGateway()
    return {
      success: true,
      data: {
        cardGateway: gateway,
        configured: gateway !== null,
        demoEnabled: process.env.PAYMENT_DEMO_ENABLED === "true",
        slipEnabled: slipPaymentEnabled(),
        publicKeys: {
          omise: process.env.OMISE_PUBLIC_KEY ?? null,
          xendit: process.env.XENDIT_PUBLIC_KEY ?? null,
          gbprimepay: process.env.GBPAY_PUBLIC_KEY ?? null,
        }
      }
    }
  })

  // ── Demo Payment (จำลองการชำระ — ใช้สำหรับทดสอบเท่านั้น) ─────────────────
  app.post("/demo", { preHandler: [requireAuth] }, async (request, reply) => {
    // ปิดไว้เสมอบน production — เปิดเฉพาะเครื่อง dev/staging ด้วย PAYMENT_DEMO_ENABLED=true
    if (process.env.PAYMENT_DEMO_ENABLED !== "true") {
      return reply.code(404).send({ success: false, error: "Not found" })
    }
    const { orderId } = request.body as { orderId: string }
    if (!orderId) return reply.code(400).send({ success: false, error: "ต้องระบุ orderId" })

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })
    if (order.status !== "pending_payment") {
      return reply.code(400).send({ success: false, error: "ออเดอร์นี้ชำระแล้ว" })
    }

    const [payment] = await db.insert(payments).values({
      orderId,
      method: "promptpay",
      amount: order.total,
      status: "verified",
      reference: `DEMO-${Date.now()}`,
      verifiedAt: new Date(),
    }).returning()

    await db.update(orders)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(orders.id, orderId))

    return { success: true, data: payment }
  })

  // ── Webhook: Xendit QR Payment ───────────────────────────────────────────
  app.post("/webhook/xendit", async (request, reply) => {
    // Verify webhook token
    const token = request.headers["x-callback-token"]
    if (!process.env.XENDIT_WEBHOOK_TOKEN || token !== process.env.XENDIT_WEBHOOK_TOKEN) {
      return reply.code(401).send({ success: false })
    }
    const body = request.body as any

    // Invoice paid (บัตรเครดิต/เดบิตผ่านหน้า Xendit Invoice)
    if (body?.external_id && (body.status === "PAID" || body.status === "SETTLED")) {
      const orderId: string = body.external_id
      try {
        const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
        if (order && order.status === "pending_payment" && Number(body.paid_amount ?? body.amount) >= Number(order.total)) {
          await db.insert(payments).values({
            orderId,
            method: "credit_card",
            amount: order.total,
            status: "verified",
            reference: body.id,
            verifiedAt: new Date(),
          }).onConflictDoNothing()
          await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId))
        }
      } catch (e) {
        app.log.error(e, "Xendit invoice webhook processing error")
      }
      return { success: true }
    }

    // QR payment completed
    if (body.event === "qr.payment" && body.data?.status === "COMPLETED") {
      const orderId: string = body.data.reference_id
      try {
        const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
        if (order && order.status === "pending_payment") {
          // The QR is created server-side for exactly order.total, but never trust the callback
          // alone: when it reports an amount/currency it must match the order before we mark it paid.
          const reportedAmount = body.data.amount
          const reportedCurrency = body.data.currency
          const amountMismatch =
            reportedAmount !== undefined && reportedAmount !== null &&
            Math.abs(Number(reportedAmount) - Number(order.total)) > 0.009
          const currencyMismatch =
            reportedCurrency !== undefined && reportedCurrency !== null &&
            String(reportedCurrency).toUpperCase() !== "THB"
          if (amountMismatch || currencyMismatch) {
            app.log.warn(
              { orderId, reportedAmount, reportedCurrency, expected: order.total },
              "Xendit QR webhook amount/currency mismatch — order NOT marked paid",
            )
            return { success: false, error: "amount_mismatch" }
          }
          await db.insert(payments).values({
            orderId,
            method: "promptpay",
            amount: order.total,
            status: "verified",
            reference: body.data.id,
            verifiedAt: new Date(),
          }).onConflictDoNothing()
          await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId))
        }
      } catch (e) {
        app.log.error(e, "Xendit webhook processing error")
      }
    }
    return { success: true }
  })

  // ── Webhook: Omise ────────────────────────────────────────────────────────
  // Omise callbacks are not signed, so the body is never trusted: we take only the charge id from
  // it and re-fetch the charge from Omise with our secret key, then check status / currency /
  // amount / order before marking anything paid.
  app.post("/webhook/omise", async (request, reply) => {
    const event = request.body as any
    if (event?.key !== "charge.complete") return { success: true } // other events: nothing to do

    if (!process.env.OMISE_SECRET_KEY) return reply.code(503).send({ success: false })
    const chargeId = event?.data?.id
    if (typeof chargeId !== "string" || !/^chrg_[A-Za-z0-9_]+$/.test(chargeId)) {
      return reply.code(400).send({ success: false })
    }

    let charge: any
    try {
      const res = await axios.get(`${OMISE_API_BASE}/charges/${chargeId}`, {
        auth: { username: process.env.OMISE_SECRET_KEY, password: "" },
      })
      charge = res.data
    } catch (e: any) {
      app.log.error({ err: e?.response?.data || e?.message }, "Omise charge lookup failed")
      return reply.code(502).send({ success: false }) // non-2xx so Omise retries
    }

    const orderId = charge?.metadata?.orderId
    const order = typeof orderId === "string"
      ? await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
      : undefined
    if (!order) return { success: false, error: "order_not_found" }
    if (order.status !== "pending_payment") return { success: true } // already processed

    const valid =
      charge.status === "successful" &&
      String(charge.currency).toLowerCase() === "thb" &&
      charge.amount === Math.round(Number(order.total) * 100)
    if (!valid) {
      app.log.warn({ orderId: order.id, chargeId, status: charge.status }, "Omise charge does not match order — NOT marked paid")
      return { success: false, error: "charge_mismatch" }
    }

    await db.insert(payments).values({
      orderId: order.id,
      method: "credit_card",
      amount: order.total,
      status: "verified",
      reference: charge.id,
      verifiedAt: new Date(),
    }).onConflictDoNothing()
    await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, order.id))
    return { success: true }
  })

  // NOTE: the GB Prime Pay (/webhook/gbpay) and 2C2P (/webhook/2c2p) handlers were removed on
  // purpose. They marked an order paid from an unauthenticated request body. Re-introduce them
  // only together with the provider's signature verification and an amount check.
}
