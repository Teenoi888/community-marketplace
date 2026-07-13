import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../db/index.js"
import { categories, users, products, communities, orders } from "../../db/schema.js"
import { eq, asc, count, ilike } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { requireAdmin, requireAuth } from "../../middleware/auth.js"

const categorySchema = z.object({
  slug:      z.string().min(2).regex(/^[a-z0-9_]+$/, "slug ใช้ได้เฉพาะ a-z 0-9 _"),
  name:      z.string().min(1),
  emoji:     z.string().min(1),
  sortOrder: z.number().int().default(0),
  isActive:  z.boolean().default(true),
})

<<<<<<< HEAD
=======
const adminProductUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  stock: z.number().int().optional(),
  images: z.array(z.string()).optional(),
  category: z.string().optional(),
  status: z.enum(["active", "inactive", "out_of_stock"]).optional(),
})

>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
export async function adminRoutes(app: FastifyInstance) {

  // ── Promote current user to admin (protected by ADMIN_SECRET env) ──────────
  // Call: POST /admin/promote   body: { secret: "..." }
  app.post("/promote", { preHandler: [requireAuth] }, async (request, reply) => {
    const { secret } = request.body as { secret?: string }
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret || secret !== adminSecret) {
      return reply.code(403).send({ success: false, error: "Secret ไม่ถูกต้อง" })
    }
    const { userId } = request.user as { userId: string }
    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId))
    return { success: true, message: "อัปเกรดเป็น Admin แล้ว" }
  })

  // ── All routes below require Admin ─────────────────────────────────────────
<<<<<<< HEAD
  app.addHook("preHandler", requireAdmin)

  // Dashboard stats
  app.get("/stats", async () => {
    const [[{ total: totalUsers }], [{ total: totalProducts }], [{ total: totalCommunities }], [{ total: totalOrders }]] =
      await Promise.all([
        db.select({ total: count() }).from(users),
        db.select({ total: count() }).from(products),
        db.select({ total: count() }).from(communities),
        db.select({ total: count() }).from(orders),
      ])
    return { success: true, data: { totalUsers, totalProducts, totalCommunities, totalOrders } }
  })

  // ── Category CRUD ──────────────────────────────────────────────────────────
  app.get("/categories", async () => {
    const rows = await db.query.categories.findMany({
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
    })
    return { success: true, data: rows }
  })

  app.post("/categories", async (request, reply) => {
    const body = categorySchema.parse(request.body)
    const [row] = await db.insert(categories).values(body).returning()
    return reply.code(201).send({ success: true, data: row })
  })

  app.patch("/categories/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = categorySchema.partial().parse(request.body)
    const [updated] = await db.update(categories).set(body).where(eq(categories.id, id)).returning()
    if (!updated) return reply.code(404).send({ success: false, error: "ไม่พบหมวดหมู่" })
    return { success: true, data: updated }
  })

  app.delete("/categories/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    await db.delete(categories).where(eq(categories.id, id))
    return { success: true }
  })

  // ── User list (for future user management) ─────────────────────────────────
  app.get("/users", async () => {
    const rows = await db.query.users.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })
    return { success: true, data: rows.map(u => ({ ...u, passwordHash: undefined })) }
  })

  // Set user role
  app.patch("/users/:id/role", async (request, reply) => {
    const { id } = request.params as { id: string }
    const { role } = request.body as { role: "user" | "admin" }
    if (!["user", "admin"].includes(role)) return reply.code(400).send({ success: false, error: "role ไม่ถูกต้อง" })
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning()
    return { success: true, data: updated }
  })

  // Reset user password (admin only)
  app.patch("/users/:id/reset-password", async (request, reply) => {
    const { id } = request.params as { id: string }
    const { newPassword } = request.body as { newPassword: string }
    if (!newPassword || newPassword.length < 6) {
      return reply.code(400).send({ success: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" })
    }
    const passwordHash = await bcrypt.hash(newPassword, 12)
    const [updated] = await db.update(users).set({ passwordHash }).where(eq(users.id, id)).returning()
    if (!updated) return reply.code(404).send({ success: false, error: "ไม่พบ user" })
    return { success: true, message: "รีเซ็ตรหัสผ่านแล้ว" }
  })

  // Search users by phone (for quick lookup)
  app.get("/users/search", async (request) => {
    const { phone } = request.query as { phone?: string }
    const rows = await db.query.users.findMany({
      where: phone ? ilike(users.phone, `%${phone}%`) : undefined,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 20,
    })
    return { success: true, data: rows.map(u => ({ ...u, passwordHash: undefined })) }
=======
  // Registered as a nested plugin so the requireAdmin hook doesn't leak onto
  // /promote above (Fastify applies addHook to the whole encapsulation scope,
  // not just routes registered after it).
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", requireAdmin)

    // Dashboard stats
    protectedRoutes.get("/stats", async () => {
      const [[{ total: totalUsers }], [{ total: totalProducts }], [{ total: totalCommunities }], [{ total: totalOrders }]] =
        await Promise.all([
          db.select({ total: count() }).from(users),
          db.select({ total: count() }).from(products),
          db.select({ total: count() }).from(communities),
          db.select({ total: count() }).from(orders),
        ])
      return { success: true, data: { totalUsers, totalProducts, totalCommunities, totalOrders } }
    })

    // ── Category CRUD ──────────────────────────────────────────────────────
    protectedRoutes.get("/categories", async () => {
      const rows = await db.query.categories.findMany({
        orderBy: [asc(categories.sortOrder), asc(categories.name)],
      })
      return { success: true, data: rows }
    })

    protectedRoutes.post("/categories", async (request, reply) => {
      const body = categorySchema.parse(request.body)
      const [row] = await db.insert(categories).values(body).returning()
      return reply.code(201).send({ success: true, data: row })
    })

    protectedRoutes.patch("/categories/:id", async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = categorySchema.partial().parse(request.body)
      const [updated] = await db.update(categories).set(body).where(eq(categories.id, id)).returning()
      if (!updated) return reply.code(404).send({ success: false, error: "ไม่พบหมวดหมู่" })
      return { success: true, data: updated }
    })

    protectedRoutes.delete("/categories/:id", async (request, reply) => {
      const { id } = request.params as { id: string }
      await db.delete(categories).where(eq(categories.id, id))
      return { success: true }
    })

    // ── Product moderation (edit/remove any product regardless of owner) ────
    protectedRoutes.get("/products", async () => {
      const rows = await db.query.products.findMany({
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        with: { shop: true },
      })
      return { success: true, data: rows }
    })

    protectedRoutes.patch("/products/:id", async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = adminProductUpdateSchema.parse(request.body)
      const [updated] = await db.update(products)
        .set({ ...body, price: body.price !== undefined ? String(body.price) : undefined })
        .where(eq(products.id, id))
        .returning()
      if (!updated) return reply.code(404).send({ success: false, error: "ไม่พบสินค้า" })
      return { success: true, data: updated }
    })

    protectedRoutes.delete("/products/:id", async (request, reply) => {
      const { id } = request.params as { id: string }
      await db.delete(products).where(eq(products.id, id))
      return { success: true }
    })

    // ── User list (for future user management) ─────────────────────────────
    protectedRoutes.get("/users", async () => {
      const rows = await db.query.users.findMany({
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      })
      return { success: true, data: rows.map(u => ({ ...u, passwordHash: undefined })) }
    })

    // Set user role
    protectedRoutes.patch("/users/:id/role", async (request, reply) => {
      const { id } = request.params as { id: string }
      const { role } = request.body as { role: "user" | "admin" }
      if (!["user", "admin"].includes(role)) return reply.code(400).send({ success: false, error: "role ไม่ถูกต้อง" })
      const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning()
      return { success: true, data: updated }
    })

    // Reset user password (admin only)
    protectedRoutes.patch("/users/:id/reset-password", async (request, reply) => {
      const { id } = request.params as { id: string }
      const { newPassword } = request.body as { newPassword: string }
      if (!newPassword || newPassword.length < 6) {
        return reply.code(400).send({ success: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" })
      }
      const passwordHash = await bcrypt.hash(newPassword, 12)
      const [updated] = await db.update(users).set({ passwordHash }).where(eq(users.id, id)).returning()
      if (!updated) return reply.code(404).send({ success: false, error: "ไม่พบ user" })
      return { success: true, message: "รีเซ็ตรหัสผ่านแล้ว" }
    })

    // Search users by phone (for quick lookup)
    protectedRoutes.get("/users/search", async (request) => {
      const { phone } = request.query as { phone?: string }
      const rows = await db.query.users.findMany({
        where: phone ? ilike(users.phone, `%${phone}%`) : undefined,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 20,
      })
      return { success: true, data: rows.map(u => ({ ...u, passwordHash: undefined })) }
    })
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
  })
}
