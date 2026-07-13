import "dotenv/config"
import Fastify from "fastify"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import jwt from "@fastify/jwt"
import rateLimit from "@fastify/rate-limit"
import websocket from "@fastify/websocket"
import multipart from "@fastify/multipart"
import postgres from "postgres"
import path from "path"
import { fileURLToPath } from "url"
import { readdir, readFile } from "fs/promises"
import { authRoutes } from "./routes/auth/index.js"
import { communityRoutes } from "./routes/communities/index.js"
import { productRoutes } from "./routes/products/index.js"
import { orderRoutes } from "./routes/orders/index.js"
import { paymentRoutes } from "./routes/payments/index.js"
import { chatRoutes } from "./routes/chat/index.js"
import { uploadRoutes } from "./routes/upload/index.js"
import { lineRoutes } from "./routes/line/index.js"
import { trackingRoutes } from "./routes/tracking/index.js"
import { addressRoutes } from "./routes/addresses/index.js"
import { categoryRoutes } from "./routes/categories/index.js"
import { adminRoutes } from "./routes/admin/index.js"
import { db } from "./db/index.js"
import { users, communities, communityMembers, shops, products } from "./db/schema.js"
import { count } from "drizzle-orm"
import bcrypt from "bcryptjs"

// Auto-migrate on startup — run all .sql files in order (all use IF NOT EXISTS so safe to re-run)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 })
console.log("⏳ Running migrations...")
try {
  const migrationsDir = path.join(__dirname, "db/migrations")
  const files = (await readdir(migrationsDir))
    .filter(f => f.endsWith(".sql"))
    .sort()
  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf-8")
    await migrationClient.unsafe(sql)
    console.log(`  ✓ ${file}`)
  }
  console.log("✅ Migrations done")
} catch (err: any) {
  // Non-fatal: schema may already be up to date (column/table already exists)
  console.warn("⚠️  Migration warning (continuing):", err?.message ?? err)
} finally {
  await migrationClient.end()
}

const app = Fastify({
  logger: { level: process.env.NODE_ENV === "production" ? "warn" : "info" },
  bodyLimit: 10 * 1024 * 1024, // 10MB for image uploads
})

// Plugins
await app.register(cors, {
  origin: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "https://chumchon.market",
    "https://www.chumchon.market",
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
await app.register(trackingRoutes,  { prefix: "/api/tracking" })
await app.register(addressRoutes,   { prefix: "/api/addresses" })
await app.register(categoryRoutes,  { prefix: "/api/categories" })
await app.register(adminRoutes,     { prefix: "/api/admin" })

// ── Seed endpoint (no auth required — protected by ADMIN_SECRET only) ──────
app.post("/api/admin/seed", async (request, reply) => {
  const { secret } = request.body as { secret?: string }
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || secret !== adminSecret) {
    return reply.code(403).send({ success: false, error: "Secret ไม่ถูกต้อง" })
  }
  const existing = await db.select({ c: count() }).from(communities)
  if (existing[0].c > 0) {
    return { success: false, message: `มีข้อมูลอยู่แล้ว (${existing[0].c} communities)` }
  }
  const [admin] = await db.insert(users).values({ name: "ผู้ดูแลระบบ", phone: "0800000001", passwordHash: await bcrypt.hash("password123", 12) }).returning()
  const [seller1] = await db.insert(users).values({ name: "สมชาย เกษตรกร", phone: "0812345678", passwordHash: await bcrypt.hash("password123", 12) }).returning()
  await db.insert(users).values({ name: "มาลี ใจดี", phone: "0898765432", passwordHash: await bcrypt.hash("password123", 12) })
  const [comm1] = await db.insert(communities).values({ name: "กลุ่มเกษตรอินทรีย์ เชียงใหม่", province: "เชียงใหม่", district: "สันทราย", subdistrict: "สันทรายหลวง", slug: "organic-chiangmai", description: "กลุ่มเกษตรกรผู้ผลิตสินค้าเกษตรอินทรีย์คุณภาพสูง จากดอยสูงเชียงใหม่", plan: "community", memberCount: 45, isVerified: true }).returning()
  const [comm2] = await db.insert(communities).values({ name: "สหกรณ์ประมงชายฝั่ง ระยอง", province: "ระยอง", district: "เมือง", subdistrict: "ท่าประดู่", slug: "fishery-rayong", description: "สหกรณ์ประมงชายฝั่ง จำหน่ายอาหารทะเลสดตรงจากทะเล", plan: "community", memberCount: 120, isVerified: true }).returning()
  const [comm3] = await db.insert(communities).values({ name: "วิสาหกิจชุมชนสมุนไพร นครราชสีมา", province: "นครราชสีมา", district: "ปากช่อง", subdistrict: "หนองสาหร่าย", slug: "herb-korat", description: "ผลิตภัณฑ์สมุนไพรแปรรูป สบู่ น้ำมันนวด ยาสมุนไพรพื้นบ้าน", plan: "pro", memberCount: 30, isVerified: true }).returning()
  await db.insert(communityMembers).values([
    { communityId: comm1.id, userId: admin.id, role: "admin" },
    { communityId: comm1.id, userId: seller1.id, role: "seller" },
    { communityId: comm2.id, userId: admin.id, role: "admin" },
    { communityId: comm3.id, userId: admin.id, role: "admin" },
  ])
  const [shop1] = await db.insert(shops).values({ communityId: comm1.id, ownerId: seller1.id, name: "ร้านผักอินทรีย์ดอยสูง", description: "ผักสดปลอดสาร ปลูกบนดอยสูง" }).returning()
  const [shop2] = await db.insert(shops).values({ communityId: comm2.id, ownerId: admin.id, name: "อาหารทะเลสดระยอง", description: "ปลาหมึก กุ้ง ปู สด ๆ จากทะเล" }).returning()
  const [shop3] = await db.insert(shops).values({ communityId: comm3.id, ownerId: admin.id, name: "สมุนไพรโคราช", description: "ผลิตภัณฑ์สมุนไพรธรรมชาติ 100%" }).returning()
  await db.insert(products).values([
    { shopId: shop1.id, name: "ผักกาดหอมออร์แกนิค", description: "ผักกาดหอมสด ปลูกแบบไฮโดรโปนิกส์", price: "89", stock: 50, images: [], category: "fresh_produce", status: "active" },
    { shopId: shop1.id, name: "มะเขือเทศราชินี", description: "มะเขือเทศราชินี หวาน อร่อย ไม่ใช้ยา", price: "120", stock: 30, images: [], category: "fresh_produce", status: "active" },
    { shopId: shop1.id, name: "กล้วยน้ำว้าอินทรีย์ (หวี)", description: "กล้วยน้ำว้า หวานธรรมชาติ จากสวนออร์แกนิค", price: "65", stock: 100, images: [], category: "fresh_produce", status: "active" },
    { shopId: shop1.id, name: "น้ำผึ้งดอยป่า (500ml)", description: "น้ำผึ้งแท้จากดอยสูง ไม่ผสมน้ำตาล", price: "350", stock: 20, images: [], category: "processed_food", status: "active" },
    { shopId: shop1.id, name: "ข้าวไรซ์เบอร์รี่ (1 กก.)", description: "ข้าวไรซ์เบอร์รี่ปลูกเอง ไม่ใช้ยาฆ่าแมลง", price: "180", stock: 80, images: [], category: "agriculture", status: "active" },
    { shopId: shop2.id, name: "กุ้งสดแช่เย็น (500g)", description: "กุ้งทะเลสด จับได้วันนี้ แช่เย็นส่งถึงบ้าน", price: "280", stock: 40, images: [], category: "seafood", status: "active" },
    { shopId: shop2.id, name: "ปลาหมึกสด (1 กก.)", description: "ปลาหมึกกล้วยสด ตัวใหญ่ สด", price: "220", stock: 25, images: [], category: "seafood", status: "active" },
    { shopId: shop2.id, name: "กะปิระยองแท้ (200g)", description: "กะปิหมักแบบโบราณ กลิ่นหอม รสเข้มข้น", price: "150", stock: 60, images: [], category: "processed_food", status: "active" },
    { shopId: shop3.id, name: "สบู่ขมิ้น-ผสมน้ำผึ้ง", description: "สบู่สมุนไพรธรรมชาติ ฟอกขาว ลดสิว", price: "89", stock: 200, images: [], category: "herb", status: "active" },
    { shopId: shop3.id, name: "น้ำมันมะพร้าวสกัดเย็น (250ml)", description: "น้ำมันมะพร้าวบริสุทธิ์ ใช้ทั้งกินและทาผิว", price: "290", stock: 50, images: [], category: "herb", status: "active" },
    { shopId: shop3.id, name: "ชาตะไคร้-ใบเตย (20 ซอง)", description: "ชาสมุนไพร ดีต่อสุขภาพ หอมหวานธรรมชาติ", price: "120", stock: 150, images: [], category: "herb", status: "active" },
  ])
  return { success: true, message: "Seed สำเร็จ! 3 ชุมชน, 3 ร้าน, 11 สินค้า", accounts: { admin: "0800000001 / password123", seller: "0812345678 / password123", buyer: "0898765432 / password123" } }
})

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
