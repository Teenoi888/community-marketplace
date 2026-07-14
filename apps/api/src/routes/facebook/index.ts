import type { FastifyInstance } from "fastify"
import axios from "axios"
import { db } from "../../db/index.js"
import { users } from "../../db/schema.js"
import { eq } from "drizzle-orm"

export async function facebookRoutes(app: FastifyInstance) {

  // Step 1 — redirect to Facebook OAuth
  app.get("/auth", async (_, reply) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/facebook/callback`,
      scope: "email public_profile",
      state: "random_state_" + Date.now(),
    })
    return reply.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`)
  })

  // Step 2 — handle callback, exchange code → token → profile
  app.get("/callback", async (request, reply) => {
    const { code } = request.query as { code: string }

    const tokenRes = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/facebook/callback`,
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
      }
    })

    const facebookToken = tokenRes.data.access_token

    const profileRes = await axios.get("https://graph.facebook.com/me", {
      params: { fields: "id,name,email,picture", access_token: facebookToken }
    })
    const { id: facebookId, name, email, picture } = profileRes.data

    let user = await db.query.users.findFirst({ where: eq(users.facebookId, facebookId) })
    if (!user && email) {
      // Link to an existing account with the same email (e.g. registered by phone/password
      // or another provider) instead of crashing on the unique email constraint.
      const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
      if (existing) {
        const [linked] = await db.update(users).set({ facebookId }).where(eq(users.id, existing.id)).returning()
        user = linked
      }
    }
    if (!user) {
      const [created] = await db.insert(users).values({
        name,
        email,
        facebookId,
        avatarUrl: picture?.data?.url,
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
