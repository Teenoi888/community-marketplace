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

export async function paymentRoutes(app: FastifyInstance) {

  // Create payment / generate PromptPay QR
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

    // If bank transfer with slip, verify immediately
    if (body.method === "bank_transfer" && body.slipUrl) {
      try {
        const verified = await verifySlip(body.slipUrl, Number(order.total))
        if (verified) {
          await db.update(payments)
            .set({ status: "verified", verifiedAt: new Date() })
            .where(eq(payments.id, payment.id))
          await db.update(orders)
            .set({ status: "paid", updatedAt: new Date() })
            .where(eq(orders.id, body.orderId))
          return { success: true, data: { ...payment, status: "verified" }, verified: true }
        }
      } catch (e) {
        app.log.warn({ err: e }, "Slip verification failed")
      }
    }

    return reply.code(201).send({ success: true, data: payment })
  })

  // Get PromptPay QR (GB Prime Pay)
  app.post("/promptpay-qr", { preHandler: [requireAuth] }, async (request) => {
    const { amount, orderId } = request.body as { amount: number; orderId: string }

    // GB Prime Pay API call
    const gbPayResponse = await axios.post(
      "https://api.gbprimepay.com/gbp/gateway/qrcode/v2",
      {
        token: process.env.GBPAY_SECRET_KEY,
        amount: amount.toFixed(2),
        referenceNo: orderId,
        backgroundUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/webhook/gbpay`,
      }
    ).catch(() => null)

    if (!gbPayResponse) {
      // Fallback: return PromptPay number for manual transfer
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

  // Webhook from GB Prime Pay
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
