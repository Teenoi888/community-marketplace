import type { FastifyRequest, FastifyReply } from "fastify"
import { db } from "../db/index.js"
import { users } from "../db/schema.js"
import { eq } from "drizzle-orm"

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ success: false, error: "Unauthorized" })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const { userId } = request.user as { userId: string }
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user || user.role !== "admin") {
      return reply.code(403).send({ success: false, error: "ไม่มีสิทธิ์เข้าถึง Admin" })
    }
  } catch {
    reply.code(401).send({ success: false, error: "Unauthorized" })
  }
}

export async function optionalAuth(request: FastifyRequest) {
  try {
    await request.jwtVerify()
  } catch {
    // allow unauthenticated
  }
}
