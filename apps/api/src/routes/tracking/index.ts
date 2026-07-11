import type { FastifyInstance } from "fastify"
import { requireAuth } from "../../middleware/auth.js"

// AfterShip carrier slugs for Thai logistics
const CARRIER_SLUGS: Record<string, string> = {
  "ไปรษณีย์ไทย":    "thailand-post",
  "Kerry Express":   "kerry-express-th",
  "Flash Express":   "flash-express",
  "J&T Express":     "jt-express-th",
  "DHL":             "dhl",
  "Lazada Logistics": "lazada-logistics-th",
  "อื่นๆ":           "",
}

export async function trackingRoutes(app: FastifyInstance) {

  // Get real-time tracking from AfterShip
  app.get("/:trackingNumber", { preHandler: [requireAuth] }, async (request, reply) => {
    const apiKey = process.env.AFTERSHIP_API_KEY
    if (!apiKey) {
      return reply.code(503).send({ success: false, error: "AfterShip ยังไม่ได้ตั้งค่า" })
    }

    const { trackingNumber } = request.params as { trackingNumber: string }
    const { carrier } = request.query as { carrier?: string }

    const slug = carrier ? (CARRIER_SLUGS[carrier] || "") : ""

    try {
      // First try to create tracking (if not exists) then get it
      const createRes = await fetch("https://api.aftership.com/v4/trackings", {
        method: "POST",
        headers: {
          "as-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tracking: {
            tracking_number: trackingNumber,
            ...(slug ? { slug } : {}),
          },
        }),
      })

      // 4003 = tracking already exists, that's fine
      const createData = await createRes.json() as any
      const trackingId = createData?.data?.tracking?.id

      // Now fetch full tracking details
      const url = slug
        ? `https://api.aftership.com/v4/trackings/${slug}/${trackingNumber}`
        : `https://api.aftership.com/v4/trackings/${trackingId || trackingNumber}`

      const trackRes = await fetch(url, {
        headers: { "as-api-key": apiKey },
      })
      const trackData = await trackRes.json() as any

      if (!trackRes.ok) {
        return reply.code(404).send({ success: false, error: "ไม่พบข้อมูลการจัดส่ง" })
      }

      const tracking = trackData?.data?.tracking
      return {
        success: true,
        data: {
          trackingNumber: tracking?.tracking_number,
          carrier: tracking?.slug,
          status: tracking?.tag,           // Pending, InTransit, OutForDelivery, Delivered, etc.
          statusText: tracking?.subtag_message,
          lastUpdate: tracking?.updated_at,
          expectedDelivery: tracking?.expected_delivery,
          origin: tracking?.origin_country_iso3,
          destination: tracking?.destination_country_iso3,
          checkpoints: (tracking?.checkpoints || []).map((cp: any) => ({
            time: cp.checkpoint_time,
            message: cp.message,
            location: [cp.city, cp.state, cp.country_name].filter(Boolean).join(", "),
          })).reverse(),
        },
      }
    } catch (err) {
      app.log.error(err)
      return reply.code(500).send({ success: false, error: "ไม่สามารถดึงข้อมูล tracking ได้" })
    }
  })
}
