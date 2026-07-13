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

function renderEmailHtml({ title, body, orderId }: { title: string; body: string; orderId: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"
  const orderUrl = `${appUrl}/orders/${orderId}`
  const orderCode = orderId.slice(0, 8).toUpperCase()

  return `
<div style="font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;">
  <div style="background: #16a34a; border-radius: 16px 16px 0 0; padding: 24px 28px; text-align: center;">
    <span style="color: #ffffff; font-size: 18px; font-weight: 700;">🛒 ตลาดชุมชน</span>
  </div>
  <div style="background: #ffffff; border-radius: 0 0 16px 16px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <h1 style="font-size: 18px; color: #111827; margin: 0 0 12px;">${title}</h1>
    <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 8px;">${body}</p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 24px;">ออเดอร์ #${orderCode}</p>
    <a href="${orderUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px;">
      ดูรายละเอียดออเดอร์
    </a>
  </div>
  <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
    อีเมลนี้ส่งอัตโนมัติจากตลาดชุมชน — เว็บไซต์ตลาดออนไลน์สำหรับชุมชนไทย
  </p>
</div>`.trim()
}

function renderLineFlexMessage({ title, body, orderId }: { title: string; body: string; orderId: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"
  const orderUrl = `${appUrl}/orders/${orderId}`
  const orderCode = orderId.slice(0, 8).toUpperCase()

  return {
    type: "flex",
    altText: title,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#16a34a",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "🛒 ตลาดชุมชน", color: "#ffffff", weight: "bold", size: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "sm",
        contents: [
          { type: "text", text: title, weight: "bold", size: "md", color: "#111827", wrap: true },
          { type: "text", text: body, size: "sm", color: "#4b5563", wrap: true, margin: "sm" },
          { type: "text", text: `ออเดอร์ #${orderCode}`, size: "xs", color: "#9ca3af", margin: "md" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#16a34a",
            action: { type: "uri", label: "ดูรายละเอียดออเดอร์", uri: orderUrl },
          },
        ],
      },
    },
  }
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
        html: renderEmailHtml({ title, body, orderId }),
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
          messages: [renderLineFlexMessage({ title, body, orderId })],
        }),
      })
    } catch (err) {
      console.error("Failed to send LINE push notification", err)
    }
  }

  return saved
}
