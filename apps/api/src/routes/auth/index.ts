import type { FastifyInstance } from "fastify"
import bcrypt from "bcryptjs"
import { z } from "zod"
<<<<<<< HEAD
import { db } from "../../db/index.js"
import { users, shops, passwordResets } from "../../db/schema.js"
import { eq, and, gt } from "drizzle-orm"
=======
import { Resend } from "resend"
import { db } from "../../db/index.js"
import { users, shops, otpCodes, passwordResets } from "../../db/schema.js"
import { eq, and, isNull, desc, gt } from "drizzle-orm"

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder")
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9).max(10),
<<<<<<< HEAD
=======
  email: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
  password: z.string().min(6),
})

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
})

<<<<<<< HEAD
=======
const otpRequestSchema = z.object({ email: z.string().email() })
const otpVerifySchema = z.object({ email: z.string().email(), code: z.string().length(6) })

const forgotPasswordSchema = z.object({ email: z.string().email() })
const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
})

>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
function createTokens(app: FastifyInstance, userId: string) {
  const accessToken = app.jwt.sign({ userId }, { expiresIn: "7d" })
  const refreshToken = app.jwt.sign({ userId, type: "refresh" }, { expiresIn: "30d" })
  return { accessToken, refreshToken }
}

<<<<<<< HEAD
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

=======
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
export async function authRoutes(app: FastifyInstance) {

  // Register
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body)
    const existing = await db.query.users.findFirst({ where: eq(users.phone, body.phone) })
    if (existing) return reply.code(409).send({ success: false, error: "เบอร์โทรนี้มีในระบบแล้ว" })

<<<<<<< HEAD
=======
    if (body.email) {
      const existingEmail = await db.query.users.findFirst({ where: eq(users.email, body.email) })
      if (existingEmail) return reply.code(409).send({ success: false, error: "อีเมลนี้มีในระบบแล้ว" })
    }

>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
    const passwordHash = await bcrypt.hash(body.password, 12)
    const [user] = await db.insert(users).values({
      name: body.name,
      phone: body.phone,
<<<<<<< HEAD
=======
      email: body.email || null,
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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

<<<<<<< HEAD
  // ── Forgot password — request OTP ──────────────────────────────────────────
=======
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
    return { success: true, accessToken, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } }
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
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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

<<<<<<< HEAD
    const otp = generateOtp()
=======
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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

<<<<<<< HEAD
  // ── Reset password — verify OTP + set new password ─────────────────────────
=======
  // Reset password (phone) — verify OTP + set new password
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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

<<<<<<< HEAD
  // ── Diagnostic: check if phone exists (no password) ────────────────────────
  app.get("/check", async (request, reply) => {
    const { phone } = request.query as { phone?: string }
    if (!phone) return reply.code(400).send({ error: "phone required" })
    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone),
    })
    return {
      exists: !!user,
      name: user?.name ?? null,
      hasPassword: !!user?.passwordHash,
      createdAt: user?.createdAt ?? null,
    }
  })

  // ── LINE Login ─────────────────────────────────────────────────────────────
  app.get("/line", async (request, reply) => {
    const channelId = process.env.LINE_CHANNEL_ID!
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://cmapi-production-5f4f.up.railway.app/api"
    const redirectUri = `${apiUrl}/auth/line/callback`   // NEXT_PUBLIC_API_URL already includes /api
    const state = Math.random().toString(36).substring(2)
    const params = new URLSearchParams({
      response_type: "code",
      client_id: channelId,
      redirect_uri: redirectUri,
      state,
      scope: "profile openid email",
    })
    return reply.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`)
  })

  app.get("/line/callback", async (request, reply) => {
    const { code, error } = request.query as { code?: string; error?: string }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"
    if (error || !code) return reply.redirect(`${appUrl}/login?error=line_cancelled`)

    try {
      const channelId = process.env.LINE_CHANNEL_ID!
      const channelSecret = process.env.LINE_CHANNEL_SECRET!
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://cmapi-production-5f4f.up.railway.app/api"
      const redirectUri = `${apiUrl}/auth/line/callback`  // NEXT_PUBLIC_API_URL already includes /api

      // Exchange code → access token
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: channelId,
          client_secret: channelSecret,
        }),
      })
      const tokenData = await tokenRes.json() as { access_token: string; error?: string }
      if (tokenData.error || !tokenData.access_token) throw new Error("LINE token error")

      // Get profile
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const profile = await profileRes.json() as { userId: string; displayName: string; pictureUrl?: string; email?: string }

      // Find or create user
      let user = await db.query.users.findFirst({ where: eq(users.lineUid, profile.userId) })
      if (user) {
        if (!user.lineUid) await db.update(users).set({ lineUid: profile.userId }).where(eq(users.id, user.id))
      } else {
        const [newUser] = await db.insert(users).values({
          name: profile.displayName || "LINE User",
          lineUid: profile.userId,
          avatarUrl: profile.pictureUrl ?? null,
        }).returning()
        user = newUser
      }

      const { accessToken, refreshToken } = createTokens(app, user.id)
      reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })
      return reply.redirect(`${appUrl}/auth/callback?token=${accessToken}`)
    } catch (err) {
      app.log.error(err)
      return reply.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"}/login?error=line_failed`)
    }
  })

  // ── Google OAuth ───────────────────────────────────────────────────────────
  app.get("/google", async (request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID!
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://cmapi-production-5f4f.up.railway.app/api"
    const redirectUri = `${apiUrl}/auth/google/callback`
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
    })
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  app.get("/google/callback", async (request, reply) => {
    const { code, error } = request.query as { code?: string; error?: string }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"
    if (error || !code) return reply.redirect(`${appUrl}/login?error=google_cancelled`)

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID!
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://cmapi-production-5f4f.up.railway.app/api"
      const redirectUri = `${apiUrl}/auth/google/callback`

      // Exchange code → access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      })
      const tokenData = await tokenRes.json() as { access_token: string }

      // Get profile
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const profile = await profileRes.json() as { sub: string; name: string; email?: string; picture?: string }

      // Find or create user
      let user = await db.query.users.findFirst({ where: eq(users.googleUid, profile.sub) })
      if (!user && profile.email) {
        user = await db.query.users.findFirst({ where: eq(users.email, profile.email) })
      }
      if (user) {
        if (!user.googleUid) await db.update(users).set({ googleUid: profile.sub }).where(eq(users.id, user.id))
      } else {
        const [newUser] = await db.insert(users).values({
          name: profile.name || "Google User",
          email: profile.email ?? null,
          googleUid: profile.sub,
          avatarUrl: profile.picture ?? null,
        }).returning()
        user = newUser
      }

      const { accessToken, refreshToken } = createTokens(app, user.id)
      reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })
      return reply.redirect(`${appUrl}/auth/callback?token=${accessToken}`)
    } catch (err) {
      app.log.error(err)
      return reply.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"}/login?error=google_failed`)
    }
  })

  // ── Facebook OAuth ─────────────────────────────────────────────────────────
  app.get("/facebook", async (request, reply) => {
    const appId = process.env.FACEBOOK_APP_ID!
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://cmapi-production-5f4f.up.railway.app/api"
    const redirectUri = `${apiUrl}/auth/facebook/callback`
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: "email,public_profile",
      response_type: "code",
    })
    return reply.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`)
  })

  app.get("/facebook/callback", async (request, reply) => {
    const { code, error } = request.query as { code?: string; error?: string }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"
    if (error || !code) return reply.redirect(`${appUrl}/login?error=facebook_cancelled`)

    try {
      const appId = process.env.FACEBOOK_APP_ID!
      const appSecret = process.env.FACEBOOK_APP_SECRET!
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://cmapi-production-5f4f.up.railway.app/api"
      const redirectUri = `${apiUrl}/auth/facebook/callback`

      // Exchange code → access token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
      )
      const tokenData = await tokenRes.json() as { access_token: string }

      // Get profile
      const profileRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`
      )
      const profile = await profileRes.json() as { id: string; name: string; email?: string; picture?: { data?: { url?: string } } }

      // Find or create user
      let user = await db.query.users.findFirst({ where: eq(users.facebookUid, profile.id) })
      if (!user && profile.email) {
        user = await db.query.users.findFirst({ where: eq(users.email, profile.email) })
      }
      if (user) {
        if (!user.facebookUid) await db.update(users).set({ facebookUid: profile.id }).where(eq(users.id, user.id))
      } else {
        const [newUser] = await db.insert(users).values({
          name: profile.name || "Facebook User",
          email: profile.email ?? null,
          facebookUid: profile.id,
          avatarUrl: profile.picture?.data?.url ?? null,
        }).returning()
        user = newUser
      }

      const { accessToken, refreshToken } = createTokens(app, user.id)
      reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })
      return reply.redirect(`${appUrl}/auth/callback?token=${accessToken}`)
    } catch (err) {
      app.log.error(err)
      return reply.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.chumchon.market"}/login?error=facebook_failed`)
    }
  })

=======
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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

<<<<<<< HEAD
  // My shops (all)
=======
  // My shops (all) — returns every shop the user owns across communities
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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
