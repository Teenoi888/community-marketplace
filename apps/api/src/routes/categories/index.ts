import type { FastifyInstance } from "fastify"
import { db } from "../../db/index.js"
import { categories } from "../../db/schema.js"
import { eq, asc } from "drizzle-orm"

export async function categoryRoutes(app: FastifyInstance) {
  // GET /categories — public, only active
  app.get("/", async () => {
    const rows = await db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
    })
    return { success: true, data: rows }
  })
}
