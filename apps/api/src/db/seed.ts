import "dotenv/config"
import { db } from "./index.js"
import { users, communities, communityMembers, shops, products } from "./schema.js"
import bcrypt from "bcryptjs"

console.log("🌱 Seeding database...")

// Users
const [admin] = await db.insert(users).values({
  name: "ผู้ดูแลระบบ",
  phone: "0800000001",
  passwordHash: await bcrypt.hash("password123", 12),
}).returning()

const [seller1] = await db.insert(users).values({
  name: "สมชาย เกษตรกร",
  phone: "0812345678",
  passwordHash: await bcrypt.hash("password123", 12),
}).returning()

const [buyer1] = await db.insert(users).values({
  name: "มาลี ใจดี",
  phone: "0898765432",
  passwordHash: await bcrypt.hash("password123", 12),
}).returning()

console.log("✅ Users created")

// Communities
const [comm1] = await db.insert(communities).values({
  name: "กลุ่มเกษตรอินทรีย์ เชียงใหม่",
  province: "เชียงใหม่",
  district: "สันทราย",
  subdistrict: "สันทรายหลวง",
  slug: "organic-chiangmai",
  description: "กลุ่มเกษตรกรผู้ผลิตสินค้าเกษตรอินทรีย์คุณภาพสูง จากดอยสูงเชียงใหม่",
  plan: "community",
  memberCount: 45,
  isVerified: true,
}).returning()

const [comm2] = await db.insert(communities).values({
  name: "สหกรณ์ประมงชายฝั่ง ระยอง",
  province: "ระยอง",
  district: "เมือง",
  subdistrict: "ท่าประดู่",
  slug: "fishery-rayong",
  description: "สหกรณ์ประมงชายฝั่ง ระยอง จำหน่ายอาหารทะเลสดตรงจากทะเล",
  plan: "community",
  memberCount: 120,
  isVerified: true,
}).returning()

const [comm3] = await db.insert(communities).values({
  name: "วิสาหกิจชุมชนสมุนไพร นครราชสีมา",
  province: "นครราชสีมา",
  district: "ปากช่อง",
  subdistrict: "หนองสาหร่าย",
  slug: "herb-korat",
  description: "ผลิตภัณฑ์สมุนไพรแปรรูป สบู่ น้ำมันนวด ยาสมุนไพรพื้นบ้าน",
  plan: "pro",
  memberCount: 30,
  isVerified: true,
}).returning()

console.log("✅ Communities created")

// Members
await db.insert(communityMembers).values([
  { communityId: comm1.id, userId: admin.id, role: "admin" },
  { communityId: comm1.id, userId: seller1.id, role: "seller" },
  { communityId: comm2.id, userId: admin.id, role: "admin" },
  { communityId: comm3.id, userId: admin.id, role: "admin" },
])

// Shops
const [shop1] = await db.insert(shops).values({
  communityId: comm1.id,
  ownerId: seller1.id,
  name: "ร้านผักอินทรีย์ดอยสูง",
  description: "ผักสดปลอดสาร ปลูกบนดอยสูง อากาศดี",
}).returning()

const [shop2] = await db.insert(shops).values({
  communityId: comm2.id,
  ownerId: admin.id,
  name: "อาหารทะเลสดระยอง",
  description: "ปลาหมึก กุ้ง ปู สด ๆ จากทะเล",
}).returning()

const [shop3] = await db.insert(shops).values({
  communityId: comm3.id,
  ownerId: admin.id,
  name: "สมุนไพรโคราช",
  description: "ผลิตภัณฑ์สมุนไพรธรรมชาติ 100%",
}).returning()

console.log("✅ Shops created")

// Products
await db.insert(products).values([
  // Shop 1 - Organic veggies
  { shopId: shop1.id, name: "ผักกาดหอมออร์แกนิค", description: "ผักกาดหอมสด ปลูกแบบไฮโดรโปนิกส์", price: "89", stock: 50, images: [], category: "fresh_produce", status: "active" },
  { shopId: shop1.id, name: "มะเขือเทศราชินี", description: "มะเขือเทศราชินี หวาน อร่อย ไม่ใช้ยา", price: "120", stock: 30, images: [], category: "fresh_produce", status: "active" },
  { shopId: shop1.id, name: "กล้วยน้ำว้าอินทรีย์ (หวี)", description: "กล้วยน้ำว้า หวานธรรมชาติ จากสวนออร์แกนิค", price: "65", stock: 100, images: [], category: "fresh_produce", status: "active" },
  { shopId: shop1.id, name: "น้ำผึ้งดอยป่า (500ml)", description: "น้ำผึ้งแท้จากดอยสูง ไม่ผสมน้ำตาล", price: "350", stock: 20, images: [], category: "processed_food", status: "active" },
  { shopId: shop1.id, name: "ข้าวไรซ์เบอร์รี่ (1 กก.)", description: "ข้าวไรซ์เบอร์รี่ปลูกเอง ไม่ใช้ยาฆ่าแมลง", price: "180", stock: 80, images: [], category: "agriculture", status: "active" },

  // Shop 2 - Seafood
  { shopId: shop2.id, name: "กุ้งสดแช่เย็น (500g)", description: "กุ้งทะเลสด จับได้วันนี้ แช่เย็นส่งถึงบ้าน", price: "280", stock: 40, images: [], category: "seafood", status: "active" },
  { shopId: shop2.id, name: "ปลาหมึกสด (1 กก.)", description: "ปลาหมึกกล้วยสด ตัวใหญ่ สด ไม่มีน้ำแข็งเกิน", price: "220", stock: 25, images: [], category: "seafood", status: "active" },
  { shopId: shop2.id, name: "กะปิระยองแท้ (200g)", description: "กะปิหมักแบบโบราณ กลิ่นหอม รสเข้มข้น", price: "150", stock: 60, images: [], category: "processed_food", status: "active" },

  // Shop 3 - Herbs
  { shopId: shop3.id, name: "สบู่ขมิ้น-ผสมน้ำผึ้ง", description: "สบู่สมุนไพรธรรมชาติ ฟอกขาว ลดสิว", price: "89", stock: 200, images: [], category: "herb", status: "active" },
  { shopId: shop3.id, name: "น้ำมันมะพร้าวสกัดเย็น (250ml)", description: "น้ำมันมะพร้าวบริสุทธิ์ ใช้ได้ทั้งกินและทาผิว", price: "290", stock: 50, images: [], category: "herb", status: "active" },
  { shopId: shop3.id, name: "ชาตะไคร้-ใบเตย (20 ซอง)", description: "ชาสมุนไพร ดีต่อสุขภาพ หอมหวานธรรมชาติ", price: "120", stock: 150, images: [], category: "herb", status: "active" },
])

console.log("✅ Products seeded (11 products)")
console.log("")
console.log("📋 Test accounts:")
console.log("  Admin:  0800000001 / password123")
console.log("  Seller: 0812345678 / password123")
console.log("  Buyer:  0898765432 / password123")

process.exit(0)
