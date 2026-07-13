import type { FastifyInstance } from "fastify"
import axios from "axios"
import { db } from "../../db/index.js"
import { users, orders, orderItems } from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { pushToUser } from "../chat/index.js"

const LINE_API = "https://api.line.me/v2"
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message"

// ---- Line Login OAuth ----

export async function lineRoutes(app: FastifyInstance) {

  // Step 1 — redirect to Line OAuth
  app.get("/auth", async (_, reply) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINE_CHANNEL_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/line/callback`,
      state: "random_state_" + Date.now(),
      scope: "profile openid email",
    })
    return reply.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`)
  })

  // Step 2 — handle callback, exchange code → token → profile
  app.get("/callback", async (request, reply) => {
    const { code } = request.query as { code: string }

    // Exchange code for token
    const tokenRes = await axios.post("https://api.line.me/oauth2/v2.1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/line/callback`,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    const lineToken = tokenRes.data.access_token

    // Get Line profile
    const profileRes = await axios.get(`${LINE_API}/profile`, {
      headers: { Authorization: `Bearer ${lineToken}` }
    })
    const { userId: lineUid, displayName, pictureUrl } = profileRes.data

    // Upsert user
    let user = await db.query.users.findFirst({ where: eq(users.lineUid, lineUid) })
    if (!user) {
      const [created] = await db.insert(users).values({
        name: displayName,
        lineUid,
        avatarUrl: pictureUrl,
      }).returning()
      user = created
    }

    // Create JWT
    const accessToken = app.jwt.sign({ userId: user.id }, { expiresIn: "15m" })
    const refreshToken = app.jwt.sign({ userId: user.id, type: "refresh" }, { expiresIn: "30d" })

    reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })

    // Redirect back to frontend with token
    return reply.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token=${accessToken}`
    )
  })

  // ---- Line Messaging Bot Webhook ----

  app.post("/webhook", async (request, reply) => {
    const { events } = request.body as { events: any[] }

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const text: string = event.message.text.toLowerCase()
        const replyToken = event.replyToken
        const lineUid = event.source.userId

        if (text.includes("สถานะ") || text.includes("order") || text.includes("ออเดอร์")) {
          const user = await db.query.users.findFirst({ where: eq(users.lineUid, lineUid) })
          if (user) {
            const recentOrders = await db.query.orders.findMany({
              where: eq(orders.buyerId, user.id),
              orderBy: [orders.createdAt],
              limit: 3,
            })
            const STATUS_TH: Record<string, string> = {
              pending_payment: "รอชำระเงิน ⏳",
              paid: "ชำระแล้ว ✅",
              preparing: "เตรียมสินค้า 📦",
              shipped: "จัดส่งแล้ว 🚚",
              delivered: "ได้รับสินค้า 🎉",
              cancelled: "ยกเลิก ❌",
            }
            const msg = recentOrders.length
              ? recentOrders.map(o =>
                  `📦 #${o.id.slice(0,8).toUpperCase()}\n${STATUS_TH[o.status]}\n฿${Number(o.total).toLocaleString()}`
                ).join("\n\n")
              : "ยังไม่มีออเดอร์"
            await sendLineReply(replyToken, msg)
          }
        } else if (text === "สวัสดี" || text === "hello" || text === "hi") {
          await sendLineReply(replyToken,
            "สวัสดีครับ! 🙏\n\nยินดีต้อนรับสู่ ตลาดชุมชน\n\n📦 พิมพ์ \"สถานะ\" เพื่อดูออเดอร์\n🛒 ช้อปปิ้งได้ที่: " +
            process.env.NEXT_PUBLIC_APP_URL
          )
        }
      }
    }

    return { status: "ok" }
  })

  // ---- Push Notification Helpers (called from other routes) ----

  app.post("/notify/order-status", { preHandler: [] }, async (request) => {
    const { userId, orderId, status } = request.body as any
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user?.lineUid) return { sent: false }

    const STATUS_MSG: Record<string, string> = {
      paid: "ได้รับการชำระเงินแล้ว กำลังเตรียมสินค้า 📦",
      preparing: "กำลังเตรียมสินค้าให้คุณ 🛒",
      shipped: "จัดส่งสินค้าแล้ว! รอรับได้เลย 🚚",
      delivered: "ได้รับสินค้าแล้ว! ขอบคุณที่ใช้บริการ 🎉",
    }

    const msg = STATUS_MSG[status]
    if (msg) {
      await sendLinePush(user.lineUid,
        `🏪 ตลาดชุมชน\n\nออเดอร์ #${orderId.slice(0,8).toUpperCase()}\n${msg}\n\nดูรายละเอียด: ${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`
      )
    }

    return { sent: true }
  })
}

// ---- Line API helpers ----

async function sendLineReply(replyToken: string, text: string) {
  return axios.post(`${LINE_MESSAGING_API}/reply`, {
    replyToken,
    messages: [{ type: "text", text }],
  }, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
  }).catch((e) => console.error("Line reply error:", e.response?.data))
}

async function sendLinePush(lineUid: string, text: string) {
  return axios.post(`${LINE_MESSAGING_API}/push`, {
    to: lineUid,
    messages: [{ type: "text", text }],
  }, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
  }).catch((e) => console.error("Line push error:", e.response?.data))
}

// Export for use in order status updates
export { sendLinePush }
