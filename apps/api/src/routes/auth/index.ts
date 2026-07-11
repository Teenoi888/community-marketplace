import type { FastifyInstance } from "fastify"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "../../db/index.js"
import { users, shops } from "../../db/schema.js"
import { eq } from "drizzle-orm"

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9).max(10),
  password: z.string().min(6),
})

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
})

function createTokens(app: FastifyInstance, userId: string) {
  const accessToken = app.jwt.sign({ userId }, { expiresIn: "7d" })
  const refreshToken = app.jwt.sign({ userId, type: "refresh" }, { expiresIn: "30d" })
  return { accessToken, refreshToken }
}

export async function authRoutes(app: FastifyInstance) {

  // Register
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body)
    const existing = await db.query.users.findFirst({ where: eq(users.phone, body.phone) })
    if (existing) return reply.code(409).send({ success: false, error: "เบอร์โทรนี้มีในระบบแล้ว" })

    const passwordHash = await bcrypt.hash(body.password, 12)
    const [user] = await db.insert(users).values({
      name: body.name,
      phone: body.phone,
      passwordHash,
    }).returning()

    const { accessToken, refreshToken } = createTokens(app, user.id)
    reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })
    return { success: true, accessToken, user: { id: user.id, name: user.name, phone: user.phone } }
  })

  // Login
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const user = await db.query.users.findFirst({ where: eq(users.phone, body.phone) })
    if (!user || !user.passwordHash) {
      return reply.code(401).send({ success: false, error: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" })
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) return reply.code(401).send({ success: false, error: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" })

    const { accessToken, refreshToken } = createTokens(app, user.id)
    reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })
    return { success: true, accessToken, user: { id: user.id, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl } }
  })

  // Refresh token
  app.post("/refresh", async (request, reply) => {
    const token = request.cookies.refreshToken
    if (!token) return reply.code(401).send({ success: false, error: "No refresh token" })
    try {
      const decoded = app.jwt.verify<{ userId: string; type: string }>(token)
      if (decoded.type !== "refresh") throw new Error()
      const accessToken = app.jwt.sign({ userId: decoded.userId }, { expiresIn: "15m" })
      return { success: true, accessToken }
    } catch {
      return reply.code(401).send({ success: false, error: "Invalid refresh token" })
    }
  })

  // Line OAuth callback
  app.get("/line/callback", async (request, reply) => {
    // TODO: Exchange code for Line user profile, upsert user, return tokens
    return reply.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?auth=line`)
  })

  // Logout
  app.post("/logout", async (_, reply) => {
    reply.clearCookie("refreshToken", { path: "/" })
    return { success: true }
  })

  // Me
  app.get("/me", { preHandler: [async (req, rep) => { try { await req.jwtVerify() } catch { rep.code(401).send({ success: false }) } }] },
    async (request) => {
      const { userId } = request.user as { userId: string }
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
      return { success: true, data: user }
    }
  )

  // My shop
  app.get("/me/shop", { preHandler: [async (req, rep) => { try { await req.jwtVerify() } catch { rep.code(401).send({ success: false }) } }] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
      if (!shop) return reply.code(404).send({ success: false, error: "ยังไม่มีร้านค้า กรุณาลงทะเบียนชุมชนก่อน" })
      return { success: true, data: shop }
    }
  )
}
