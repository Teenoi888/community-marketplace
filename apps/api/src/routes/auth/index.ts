import type { FastifyInstance } from "fastify"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { Resend } from "resend"
import { db } from "../../db/index.js"
import { users, shops, otpCodes, passwordResets } from "../../db/schema.js"
import { eq, and, isNull, desc, gt } from "drizzle-orm"

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder")

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9).max(10),
  email: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  password: z.string().min(6),
})

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
})

const otpRequestSchema = z.object({ email: z.string().email() })
const otpVerifySchema = z.object({ email: z.string().email(), code: z.string().length(6) })

const forgotPasswordSchema = z.object({ email: z.string().email() })
const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
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

    if (body.email) {
      const existingEmail = await db.query.users.findFirst({ where: eq(users.email, body.email) })
      if (existingEmail) return reply.code(409).send({ success: false, error: "อีเมลนี้มีในระบบแล้ว" })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)
    const [user] = await db.insert(users).values({
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      passwordHash,
    }).returning()

    const { accessToken, refreshToken } = createTokens(app, user.id)
    reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })
    return { success: true, accessToken, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } }
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
    return { success: true, accessToken, user: { id: user.id, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl, role: user.role } }
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

  // Request email OTP
  app.post("/otp/request", async (request, reply) => {
    const { email } = otpRequestSchema.parse(request.body)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await db.insert(otpCodes).values({ email, code, expiresAt, purpose: "login" })

    try {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        subject: "รหัสยืนยันตัวตน - ตลาดชุมชน",
        html: `<p>รหัส OTP ของคุณคือ <strong>${code}</strong><br/>หมดอายุใน 5 นาที</p>`,
      })
      if (error) throw error
    } catch (err) {
      app.log.error(err, "Failed to send OTP email")
      return reply.code(502).send({ success: false, error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" })
    }

    return { success: true }
  })

  // Verify email OTP
  app.post("/otp/verify", async (request, reply) => {
    const { email, code } = otpVerifySchema.parse(request.body)
    const otp = await db.query.otpCodes.findFirst({
      where: and(eq(otpCodes.email, email), eq(otpCodes.code, code), eq(otpCodes.purpose, "login"), isNull(otpCodes.consumedAt)),
      orderBy: [desc(otpCodes.createdAt)],
    })
    if (!otp || otp.expiresAt < new Date()) {
      return reply.code(401).send({ success: false, error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ" })
    }
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id))

    let user = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (!user) {
      const [created] = await db.insert(users).values({ name: email.split("@")[0], email }).returning()
      user = created
    }

    const { accessToken, refreshToken } = createTokens(app, user.id)
    reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })
    return { success: true, accessToken, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role } }
  })

  // Request password reset OTP
  app.post("/password/forgot", async (request, reply) => {
    const { email } = forgotPasswordSchema.parse(request.body)
    const user = await db.query.users.findFirst({ where: eq(users.email, email) })

    // Always respond success to avoid leaking whether an email is registered
    if (!user) return { success: true }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await db.insert(otpCodes).values({ email, code, expiresAt, purpose: "reset_password" })

    try {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        subject: "รีเซ็ตรหัสผ่าน - ตลาดชุมชน",
        html: `<p>รหัสสำหรับตั้งรหัสผ่านใหม่คือ <strong>${code}</strong><br/>หมดอายุใน 5 นาที</p>`,
      })
      if (error) throw error
    } catch (err) {
      app.log.error(err, "Failed to send password reset email")
      return reply.code(502).send({ success: false, error: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" })
    }

    return { success: true }
  })

  // Reset password with OTP
  app.post("/password/reset", async (request, reply) => {
    const { email, code, newPassword } = resetPasswordSchema.parse(request.body)
    const otp = await db.query.otpCodes.findFirst({
      where: and(eq(otpCodes.email, email), eq(otpCodes.code, code), eq(otpCodes.purpose, "reset_password"), isNull(otpCodes.consumedAt)),
      orderBy: [desc(otpCodes.createdAt)],
    })
    if (!otp || otp.expiresAt < new Date()) {
      return reply.code(401).send({ success: false, error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุ" })
    }

    const user = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (!user) return reply.code(404).send({ success: false, error: "ไม่พบบัญชีผู้ใช้" })

    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id))
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

    return { success: true }
  })

  // Request phone-based password reset OTP
  app.post("/forgot-password", async (request, reply) => {
    const { phone } = request.body as { phone: string }
    if (!phone || phone.length < 9) {
      return reply.code(400).send({ success: false, error: "กรุณากรอกเบอร์โทรที่ถูกต้อง" })
    }

    const user = await db.query.users.findFirst({ where: eq(users.phone, phone) })

    // ถ้าไม่พบเบอร์ → ตอบ success เหมือนกัน (ป้องกัน user enumeration)
    if (!user) {
      return { success: true, message: "หากมีบัญชีด้วยเบอร์นี้ จะได้รับ OTP" }
    }

    // ลบ OTP เก่าของเบอร์นี้ก่อน
    await db.delete(passwordResets).where(eq(passwordResets.phone, phone))

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 นาที

    await db.insert(passwordResets).values({ phone, otp, expiresAt })

    // TODO: ส่ง OTP ผ่าน SMS (Twilio/DTAC/AIS) หรือ LINE Message API
    // ตอนนี้ส่ง OTP กลับ (dev/test mode เท่านั้น — ใน production ให้ลบ otpPreview ออก)
    const isProduction = process.env.NODE_ENV === "production"
    return {
      success: true,
      message: "ส่ง OTP แล้ว (ตอนนี้แสดงบนหน้าจอ — จะเปลี่ยนเป็น SMS ในอนาคต)",
      otpPreview: isProduction ? undefined : otp,  // แสดงเฉพาะ dev mode
    }
  })

  // Reset password (phone) — verify OTP + set new password
  app.post("/reset-password", async (request, reply) => {
    const { phone, otp, newPassword } = request.body as {
      phone: string
      otp: string
      newPassword: string
    }

    if (!phone || !otp || !newPassword || newPassword.length < 6) {
      return reply.code(400).send({ success: false, error: "ข้อมูลไม่ครบถ้วน" })
    }

    const now = new Date()
    const record = await db.query.passwordResets.findFirst({
      where: and(
        eq(passwordResets.phone, phone),
        eq(passwordResets.otp, otp),
        gt(passwordResets.expiresAt, now),
      ),
    })

    if (!record) {
      return reply.code(400).send({ success: false, error: "OTP ไม่ถูกต้องหรือหมดอายุแล้ว" })
    }

    const user = await db.query.users.findFirst({ where: eq(users.phone, phone) })
    if (!user) return reply.code(404).send({ success: false, error: "ไม่พบบัญชีนี้" })

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

    // ลบ OTP ที่ใช้แล้ว
    await db.delete(passwordResets).where(eq(passwordResets.phone, phone))

    return { success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" }
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

  // My shop (single — backward compat)
  app.get("/me/shop", { preHandler: [async (req, rep) => { try { await req.jwtVerify() } catch { rep.code(401).send({ success: false }) } }] },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, userId) })
      if (!shop) return reply.code(404).send({ success: false, error: "ยังไม่มีร้านค้า กรุณาลงทะเบียนชุมชนก่อน" })
      return { success: true, data: shop }
    }
  )

  // My shops (all) — returns every shop the user owns across communities
  app.get("/me/shops", { preHandler: [async (req, rep) => { try { await req.jwtVerify() } catch { rep.code(401).send({ success: false }) } }] },
    async (request) => {
      const { userId } = request.user as { userId: string }
      const userShops = await db.query.shops.findMany({
        where: eq(shops.ownerId, userId),
        with: { community: true },
      })
      return { success: true, data: userShops }
    }
  )
}
