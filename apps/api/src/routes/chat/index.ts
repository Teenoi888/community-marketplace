import type { FastifyInstance } from "fastify"
import { db } from "../../db/index.js"
import { conversations, messages, users } from "../../db/schema.js"
import { eq, or, and, desc, ne, isNull, count } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

// In-memory socket registry: userId → WebSocket
const connectedClients = new Map<string, any>()

export async function chatRoutes(app: FastifyInstance) {

  // WebSocket endpoint — ws://localhost:3001/api/chat/ws?token=...
  // Browsers can't set custom headers on a WebSocket handshake, so the token
  // travels as a query param instead of Authorization — verify it that way
  // rather than requireAuth (which only checks the header and would 401 every
  // connection).
  app.get("/ws", {
    websocket: true,
    preHandler: [async (request, reply) => {
      const { token } = request.query as { token?: string }
      if (!token) return reply.code(401).send({ success: false, error: "Unauthorized" })
      try {
        (request as any).user = app.jwt.verify(token)
      } catch {
        reply.code(401).send({ success: false, error: "Unauthorized" })
      }
    }],
  }, (connection: any, request) => {
    // @fastify/websocket v8 passes a SocketStream wrapper (a Duplex), not the
    // raw WebSocket — .send()/.on("message")/.readyState all live on
    // connection.socket. Calling them on the wrapper directly is a silent
    // no-op (Duplex has its own unrelated "data"/"end" events), which is why
    // chat never actually sent or received anything.
    const socket = connection.socket
    const { userId } = (request as any).user as { userId: string }

    connectedClients.set(userId, socket)
    app.log.info(`Chat: user ${userId} connected (${connectedClients.size} online)`)

    socket.on("message", async (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString())

        if (msg.type === "send_message") {
          const { conversationId, content, messageType = "text" } = msg

          // Persist to DB
          const [saved] = await db.insert(messages).values({
            conversationId,
            senderId: userId,
            content,
            type: messageType,
          }).returning()

          // Update conversation timestamp
          await db.update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, conversationId))

          // Get conversation to find recipient
          const conv = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
          })
          if (!conv) return

          const recipientId = conv.buyerId === userId ? conv.sellerId : conv.buyerId
          const payload = JSON.stringify({
            type: "new_message",
            data: { ...saved, conversationId },
          })

          // Send to sender (echo)
          socket.send(payload)

          // Send to recipient if online
          const recipientSocket = connectedClients.get(recipientId)
          if (recipientSocket?.readyState === 1) {
            recipientSocket.send(payload)
          }
        }

        if (msg.type === "ping") socket.send(JSON.stringify({ type: "pong" }))

        // Presence: client asks "is this specific user online right now"
        // (polled periodically) rather than us tracking who's watching whom.
        if (msg.type === "check_presence") {
          const { userId: targetId } = msg
          const targetSocket = connectedClients.get(targetId)
          socket.send(JSON.stringify({
            type: "presence",
            userId: targetId,
            online: targetSocket?.readyState === 1,
          }))
        }

        // Mark all of the other party's messages in a conversation as read,
        // then tell their socket (if online) so their sent bubbles flip to
        // "อ่านแล้ว" live instead of only on next page load.
        if (msg.type === "mark_read") {
          const { conversationId } = msg
          const updated = await db.update(messages)
            .set({ readAt: new Date() })
            .where(and(
              eq(messages.conversationId, conversationId),
              ne(messages.senderId, userId),
              isNull(messages.readAt),
            ))
            .returning({ senderId: messages.senderId })

          const senderIds = new Set(updated.map(m => m.senderId))
          for (const senderId of senderIds) {
            const senderSocket = connectedClients.get(senderId)
            if (senderSocket?.readyState === 1) {
              senderSocket.send(JSON.stringify({ type: "messages_read", conversationId, readBy: userId }))
            }
          }
        }
      } catch (e) {
        app.log.error({ err: e }, "Chat WS error")
      }
    })

    socket.on("close", () => {
      connectedClients.delete(userId)
      app.log.info(`Chat: user ${userId} disconnected`)
    })
  })

  // Get or create conversation
  app.post("/conversations", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = (request as any).user as { userId: string }
    const { sellerId, orderId } = request.body as { sellerId: string; orderId?: string }

    let conv = await db.query.conversations.findFirst({
      where: and(eq(conversations.buyerId, userId), eq(conversations.sellerId, sellerId)),
    })

    if (!conv) {
      const [created] = await db.insert(conversations).values({
        buyerId: userId,
        sellerId,
        orderId,
      }).returning()
      conv = created
    }

    return reply.code(201).send({ success: true, data: conv })
  })

  // List my conversations
  app.get("/conversations", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = (request as any).user as { userId: string }

    const convs = await db.query.conversations.findMany({
      where: or(
        eq(conversations.buyerId, userId),
        eq(conversations.sellerId, userId)
      ),
      orderBy: [desc(conversations.updatedAt)],
    })

    // Attach last message for each
    const withLastMsg = await Promise.all(convs.map(async (c) => {
      const lastMsg = await db.query.messages.findFirst({
        where: eq(messages.conversationId, c.id),
        orderBy: [desc(messages.createdAt)],
      })
      const otherId = c.buyerId === userId ? c.sellerId : c.buyerId
      const other = await db.query.users.findFirst({ where: eq(users.id, otherId) })
      return { ...c, lastMessage: lastMsg, otherUser: other ? { ...other, passwordHash: undefined } : other }
    }))

    return { success: true, data: withLastMsg }
  })

  // Unread message count across all my conversations (for the nav badge)
  app.get("/unread-count", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = (request as any).user as { userId: string }

    const myConvs = await db.query.conversations.findMany({
      where: or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)),
      columns: { id: true },
    })
    if (!myConvs.length) return { success: true, data: { count: 0 } }

    const counts = await Promise.all(myConvs.map(c =>
      db.select({ total: count() }).from(messages).where(and(
        eq(messages.conversationId, c.id),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ))
    ))

    return { success: true, data: { count: counts.reduce((sum, [row]) => sum + row.total, 0) } }
  })

  // Get messages in a conversation
  app.get("/conversations/:id/messages", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string }
    const { before, limit = "30" } = request.query as Record<string, string>

    const msgs = await db.query.messages.findMany({
      where: eq(messages.conversationId, id),
      orderBy: [desc(messages.createdAt)],
      limit: Math.min(Number(limit), 100),
    })

    return { success: true, data: msgs.reverse() }
  })
}

// Helper: push notification to user if offline (Line OA / push)
export function pushToUser(userId: string, payload: object) {
  const socket = connectedClients.get(userId)
  if (socket?.readyState === 1) {
    socket.send(JSON.stringify(payload))
    return true
  }
  return false // user offline → caller should send Line push
}
