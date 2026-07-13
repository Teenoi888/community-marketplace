import type { FastifyInstance } from "fastify"
import { z } from "zod"
import axios from "axios"
import { db } from "../../db/index.js"
import { payments, orders } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["promptpay", "qr_code", "bank_transfer", "credit_card"]),
  slipUrl: z.string().url().optional(),
})

// ─── Detect which card gateway is configured ─────────────────────────────────
function detectCardGateway(): "omise" | "gbprimepay" | "2c2p" | null {
  if (process.env.OMISE_SECRET_KEY)       return "omise"
  if (process.env.GBPAY_SECRET_KEY)       return "gbprimepay"
  if (process.env.TWOC2P_SECRET_KEY)      return "2c2p"
  return null
}

export async function paymentRoutes(app: FastifyInstance) {

  // ── Create payment / slip upload ──────────────────────────────────────────
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createPaymentSchema.parse(request.body)
    const order = await db.query.orders.findFirst({ where: eq(orders.id, body.orderId) })
    if (!order) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })

    const [payment] = await db.insert(payments).values({
      orderId: body.orderId,
      method: body.method,
      amount: order.total,
      status: "pending",
      slipUrl: body.slipUrl,
    }).returning()

    // Auto-verify slip on bank transfer
    if (body.method === "bank_transfer" && body.slipUrl) {
      try {
        const verified = await verifySlip(body.slipUrl, Number(order.total))
        if (verified) {
          await db.update(payments).set({ status: "verified", verifiedAt: new Date() }).where(eq(payments.id, payment.id))
          await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, body.orderId))
          return { success: true, data: { ...payment, status: "verified" }, verified: true }
        }
      } catch (e) {
        app.log.warn({ err: e }, "Slip verification failed")
      }
    }

    return reply.code(201).send({ success: true, data: payment })
  })

  // ── PromptPay QR ─────────────────────────────────────────────────────────
  app.post("/promptpay-qr", { preHandler: [requireAuth] }, async (request) => {
    const { amount, orderId } = request.body as { amount: number; orderId: string }

    const gbPayResponse = await axios.post(
      "https://api.gbprimepay.com/gbp/gateway/qrcode/v2",
      {
        token: process.env.GBPAY_SECRET_KEY,
        amount: amount.toFixed(2),
        referenceNo: orderId,
        backgroundUrl: `${process.env.API_URL}/api/payments/webhook/gbpay`,
      }
    ).catch(() => null)

    if (!gbPayResponse) {
      return {
        success: true,
        data: {
          type: "promptpay",
          promptpayId: process.env.PROMPTPAY_ID || "0812345678",
          amount,
          orderId,
        }
      }
    }
    return { success: true, data: gbPayResponse.data }
  })

  // ── Card Payment Session ─────────────────────────────────────────────────
  // เตรียม endpoint ไว้รองรับ Omise / GB Prime Pay / 2C2P
  // เมื่อได้ key จาก gateway แล้วให้ใส่ใน Railway env vars แล้วระบบจะเชื่อมทันที
  app.post("/card-session", { preHandler: [requireAuth] }, async (request, reply) => {
    const schema = z.object({
      orderId: z.string().uuid(),
      // Omise: ส่ง token จาก Omise.js (frontend tokenization)
      omiseToken: z.string().optional(),
      // 2C2P / GB Prime Pay: ส่ง encrypted card data
      encryptedCard: z.string().optional(),
    })
    const body = schema.parse(request.body)
    const order = await db.query.orders.findFirst({ where: eq(orders.id, body.orderId) })
    if (!order) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })

    const gateway = detectCardGateway()

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

    // ── GB Prime Pay (Credit Card) ──────────────────────────────────────────
    if (gateway === "gbprimepay" && body.encryptedCard) {
      try {
        const res = await axios.post(
          "https://api.gbprimepay.com/gbp/gateway/card",
          {
            token: process.env.GBPAY_SECRET_KEY,
            amount: Number(order.total).toFixed(2),
            referenceNo: order.id,
            gbpReferenceNo: body.encryptedCard,
            backgroundUrl: `${process.env.API_URL}/api/payments/webhook/gbpay`,
            responseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/${order.id}/card-result`,
          }
        )
        return { success: true, data: { gateway: "gbprimepay", ...res.data } }
      } catch (err: any) {
        app.log.error(err?.response?.data || err)
        return reply.code(500).send({ success: false, error: "GB Prime Pay charge failed" })
      }
    }

    // ── 2C2P (Payment Link / Hosted Page) ──────────────────────────────────
    if (gateway === "2c2p") {
      // 2C2P ใช้ Payment Token API แล้ว redirect ไปหน้า hosted payment
      try {
        const res = await axios.post(
          "https://pgw.2c2p.com/payment/4.1/PaymentToken",
          {
            merchantID: process.env.TWOC2P_MERCHANT_ID,
            invoiceNo: order.id.replace(/-/g, "").slice(0, 20),
            description: `Order #${order.id.slice(0, 8)}`,
            amount: Number(order.total).toFixed(2),
            currencyCode: "764", // THB
            paymentChannel: ["CC"],
            request3DS: "Y",
            backendReturnUrl: `${process.env.API_URL}/api/payments/webhook/2c2p`,
            frontendReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/${order.id}/card-result`,
          },
          { headers: { "content-type": "application/json", "secret-key": process.env.TWOC2P_SECRET_KEY! } }
        )
        const paymentToken = res.data.paymentToken
        return {
          success: true,
          data: {
            gateway: "2c2p",
            redirectUrl: `https://pgw.2c2p.com/payment/4.1/payment?paymentToken=${paymentToken}`,
          }
        }
      } catch (err: any) {
        app.log.error(err?.response?.data || err)
        return reply.code(500).send({ success: false, error: "2C2P payment failed" })
      }
    }

    // ── No gateway configured ───────────────────────────────────────────────
    return reply.code(503).send({
      success: false,
      error: "payment_gateway_not_configured",
      message: "ยังไม่ได้เชื่อมต่อ Payment Gateway — กรุณาตั้งค่า OMISE_SECRET_KEY, GBPAY_SECRET_KEY หรือ TWOC2P_SECRET_KEY ใน environment variables",
      supportedGateways: ["omise", "gbprimepay", "2c2p"],
    })
  })

  // ── Card payment result (after 3DS redirect) ────────────────────────────
  app.get("/card-result/:orderId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const query = request.query as { status?: string; chargeId?: string }

    // Check order status from DB (webhook should have updated it already)
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) return reply.code(404).send({ success: false, error: "ไม่พบออเดอร์" })

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
        publicKeys: {
          omise: process.env.OMISE_PUBLIC_KEY ?? null,        // used by Omise.js frontend tokenization
          gbprimepay: process.env.GBPAY_PUBLIC_KEY ?? null,   // used by GB Prime Pay.js
        }
      }
    }
  })

  // ── Demo Payment (จำลองการชำระ — ใช้สำหรับทดสอบเท่านั้น) ─────────────────
  app.post("/demo", { preHandler: [requireAuth] }, async (request, reply) => {
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

  // ── Webhook: GB Prime Pay ─────────────────────────────────────────────────
  app.post("/webhook/gbpay", async (request) => {
    const { referenceNo, resultCode } = request.body as any
    if (resultCode === "00") {
      const payment = await db.query.payments.findFirst({ where: eq(payments.orderId, referenceNo) })
      if (payment) {
        await db.update(payments).set({ status: "verified", verifiedAt: new Date() }).where(eq(payments.id, payment.id))
        await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, referenceNo))
      }
    }
    return { success: true }
  })

  // ── Webhook: Omise ────────────────────────────────────────────────────────
  app.post("/webhook/omise", async (request) => {
    const event = request.body as any
    if (event.key === "charge.complete" && event.data?.status === "successful") {
      const orderId = event.data?.metadata?.orderId
      if (orderId) {
        const payment = await db.query.payments.findFirst({ where: eq(payments.orderId, orderId) })
        if (payment) {
          await db.update(payments).set({ status: "verified", verifiedAt: new Date(), reference: event.data.id }).where(eq(payments.id, payment.id))
          await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId))
        }
      }
    }
    return { success: true }
  })

  // ── Webhook: 2C2P ────────────────────────────────────────────────────────
  app.post("/webhook/2c2p", async (request) => {
    const body = request.body as any
    // 2C2P sends respCode "0000" for success
    if (body.respCode === "0000") {
      const orderId = body.invoiceNo  // we set invoiceNo = orderId (truncated)
      // Find order by matching first 20 chars of id (without dashes)
      const allOrders = await db.select().from(orders)
      const order = allOrders.find(o => o.id.replace(/-/g, "").slice(0, 20) === orderId)
      if (order) {
        const payment = await db.query.payments.findFirst({ where: eq(payments.orderId, order.id) })
        if (payment) {
          await db.update(payments).set({ status: "verified", verifiedAt: new Date(), reference: body.tranRef }).where(eq(payments.id, payment.id))
          await db.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, order.id))
        }
      }
    }
    // 2C2P expects specific redirect back
    return { success: true }
  })
}

async function verifySlip(slipUrl: string, expectedAmount: number): Promise<boolean> {
  try {
    const { data } = await axios.post(
      "https://developer.easyslip.com/api/v1/verify",
      { url: slipUrl },
      { headers: { Authorization: `Bearer ${process.env.EASYSLIP_API_KEY}` } }
    )
    return data.data?.amount?.amount === expectedAmount
  } catch {
    return false
  }
}
