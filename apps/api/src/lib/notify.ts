import { Resend } from "resend"
import { db } from "../db/index.js"
import { notifications, users } from "../db/schema.js"
import { eq } from "drizzle-orm"
import { pushToUser } from "../routes/chat/index.js"

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder")

interface NotifyOrderStatusInput {
  userId: string
  orderId: string
  title: string
  body: string
}

// Creates a notification row, pushes it live if the user is connected via
// websocket, and best-effort sends email / LINE — failures in the delivery
// channels never block the DB write or the caller's request.
export async function notifyOrderStatus({ userId, orderId, title, body }: NotifyOrderStatusInput) {
  const [saved] = await db.insert(notifications).values({
    userId,
    type: "order_status",
    title,
    body,
    link: `/orders/${orderId}`,
    orderId,
  }).returning()

  pushToUser(userId, { type: "notification", data: saved })

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return saved

  if (user.email && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: user.email,
        subject: `${title} - ตลาดชุมชน`,
        html: `<p>${body}</p>`,
      })
    } catch (err) {
      console.error("Failed to send order status email", err)
    }
  }

  if (user.lineUid && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    try {
      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: user.lineUid,
          messages: [{ type: "text", text: `${title}\n${body}` }],
        }),
      })
    } catch (err) {
      console.error("Failed to send LINE push notification", err)
    }
  }

  return saved
}
