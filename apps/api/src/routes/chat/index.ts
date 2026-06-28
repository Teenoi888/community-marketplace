import type { FastifyInstance } from "fastify"
import { db } from "../../db/index.js"
import { conversations, messages, users } from "../../db/schema.js"
import { eq, or, and, desc } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

// In-memory socket registry: userId → WebSocket
const connectedClients = new Map<string, any>()

export async function chatRoutes(app: FastifyInstance) {

  // WebSocket endpoint — ws://localhost:3001/api/chat/ws
  app.get("/ws", { websocket: true, preHandler: [requireAuth] }, (socket: any, request) => {
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
      return { ...c, lastMessage: lastMsg, otherUser: other }
    }))

    return { success: true, data: withLastMsg }
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
