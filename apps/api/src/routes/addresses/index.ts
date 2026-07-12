import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { userAddresses } from "../../db/schema.js"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "../../middleware/auth.js"

const addressSchema = z.object({
  label:    z.string().default("บ้าน"),
  name:     z.string().min(2),
  phone:    z.string().min(9),
  address:  z.string().min(5),
  province: z.string().min(2),
  district: z.string().min(2),
  zipCode:  z.string().length(5),
  isDefault: z.boolean().default(false),
})

export async function addressRoutes(app: FastifyInstance) {

  // GET /addresses — list mine
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const { userId } = request.user as { userId: string }
    const rows = await db.query.userAddresses.findMany({
      where: eq(userAddresses.userId, userId),
      orderBy: (t, { desc }) => [desc(t.isDefault), desc(t.createdAt)],
    })
    return { success: true, data: rows }
  })

  // POST /addresses — create
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const body = addressSchema.parse(request.body)

    // If isDefault, clear existing defaults first
    if (body.isDefault) {
      await db.update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.userId, userId))
    }

    const [addr] = await db.insert(userAddresses).values({
      userId,
      ...body,
    }).returning()

    return reply.code(201).send({ success: true, data: addr })
  })

  // PATCH /addresses/:id — update (label, fields, or isDefault)
  app.patch("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const body = addressSchema.partial().parse(request.body)

    const existing = await db.query.userAddresses.findFirst({
      where: and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)),
    })
    if (!existing) return reply.code(404).send({ success: false, error: "ไม่พบที่อยู่" })

    if (body.isDefault) {
      await db.update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.userId, userId))
    }

    const [updated] = await db.update(userAddresses)
      .set(body)
      .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)))
      .returning()

    return { success: true, data: updated }
  })

  // DELETE /addresses/:id
  app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    await db.delete(userAddresses)
      .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)))
    return { success: true }
  })
}
