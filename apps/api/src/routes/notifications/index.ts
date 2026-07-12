import type { FastifyInstance } from "fastify"
import { db } from "../../db/index.js"
import { notifications } from "../../db/schema.js"
import { eq, and, desc, count } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

export async function notificationRoutes(app: FastifyInstance) {

  // List my notifications
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const rows = await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    })
    return { success: true, data: rows }
  })

  // Unread count (for the bell badge)
  app.get("/unread-count", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const [row] = await db.select({ c: count() }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    return { success: true, data: row.c }
  })

  // Mark one as read
  app.patch("/:id/read", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning()
    if (!updated) return reply.code(404).send({ success: false, error: "ไม่พบการแจ้งเตือน" })
    return { success: true, data: updated }
  })

  // Mark all as read
  app.patch("/read-all", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    return { success: true }
  })
}
