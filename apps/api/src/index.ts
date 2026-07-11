import "dotenv/config"
import Fastify from "fastify"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import jwt from "@fastify/jwt"
import rateLimit from "@fastify/rate-limit"
import websocket from "@fastify/websocket"
import multipart from "@fastify/multipart"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import path from "path"
import { fileURLToPath } from "url"
import { authRoutes } from "./routes/auth/index.js"
import { communityRoutes } from "./routes/communities/index.js"
import { productRoutes } from "./routes/products/index.js"
import { orderRoutes } from "./routes/orders/index.js"
import { paymentRoutes } from "./routes/payments/index.js"
import { chatRoutes } from "./routes/chat/index.js"
import { uploadRoutes } from "./routes/upload/index.js"
import { lineRoutes } from "./routes/line/index.js"
import { googleRoutes } from "./routes/google/index.js"
import { facebookRoutes } from "./routes/facebook/index.js"
import { trackingRoutes } from "./routes/tracking/index.js"

// Auto-migrate on startup
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 })
const migrationDb = drizzle(migrationClient)
console.log("⏳ Running migrations...")
await migrate(migrationDb, { migrationsFolder: path.join(__dirname, "db/migrations") })
await migrationClient.end()
console.log("✅ Migrations done")

const app = Fastify({
  logger: { level: process.env.NODE_ENV === "production" ? "warn" : "info" },
  bodyLimit: 10 * 1024 * 1024, // 10MB for image uploads
})

// Plugins
await app.register(cors, {
  origin: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "https://liff.line.me",
  ],
  credentials: true,
})
await app.register(cookie, { secret: process.env.JWT_SECRET! })
await app.register(jwt, { secret: process.env.JWT_SECRET! })
await app.register(rateLimit, { max: 200, timeWindow: "1 minute" })
await app.register(websocket)
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB

// Health check
app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }))

// Routes
await app.register(authRoutes,      { prefix: "/api/auth" })
await app.register(communityRoutes, { prefix: "/api/communities" })
await app.register(productRoutes,   { prefix: "/api/products" })
await app.register(orderRoutes,     { prefix: "/api/orders" })
await app.register(paymentRoutes,   { prefix: "/api/payments" })
await app.register(chatRoutes,      { prefix: "/api/chat" })
await app.register(uploadRoutes,    { prefix: "/api/upload" })
await app.register(lineRoutes,      { prefix: "/api/line" })
await app.register(googleRoutes,    { prefix: "/api/google" })
await app.register(facebookRoutes,  { prefix: "/api/facebook" })
await app.register(trackingRoutes,  { prefix: "/api/tracking" })

// Global error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error)
  if (error.validation) {
    return reply.code(400).send({ success: false, error: "ข้อมูลไม่ถูกต้อง", details: error.validation })
  }
  reply.code(error.statusCode || 500).send({ success: false, error: error.message })
})

const port = Number(process.env.PORT) || 3001
await app.listen({ port, host: "0.0.0.0" })
console.log(`🚀 API: http://localhost:${port}`)
