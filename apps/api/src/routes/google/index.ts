import type { FastifyInstance } from "fastify"
import axios from "axios"
import { db } from "../../db/index.js"
import { users } from "../../db/schema.js"
import { eq } from "drizzle-orm"

export async function googleRoutes(app: FastifyInstance) {

  // Step 1 — redirect to Google OAuth
  app.get("/auth", async (_, reply) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/google/callback`,
      scope: "openid email profile",
      state: "random_state_" + Date.now(),
    })
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  // Step 2 — handle callback, exchange code → token → profile
  app.get("/callback", async (request, reply) => {
    const { code } = request.query as { code: string }

    const tokenRes = await axios.post("https://oauth2.googleapis.com/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/google/callback`,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )

    const googleToken = tokenRes.data.access_token

    const profileRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${googleToken}` }
    })
    const { id: googleId, name, email, picture } = profileRes.data

    let user = await db.query.users.findFirst({ where: eq(users.googleId, googleId) })
    if (!user) {
      const [created] = await db.insert(users).values({
        name,
        email,
        googleId,
        avatarUrl: picture,
      }).returning()
      user = created
    }

    const accessToken = app.jwt.sign({ userId: user.id }, { expiresIn: "15m" })
    const refreshToken = app.jwt.sign({ userId: user.id, type: "refresh" }, { expiresIn: "30d" })

    reply.setCookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", path: "/" })

    return reply.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token=${accessToken}`
    )
  })
}
