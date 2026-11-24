import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { users, communities, communityMembers, shops, products } from "../db/schema.js"

// Fake people for UAT / staging only. Every email uses the reserved ".test"
// domain (RFC 2606), which can never be delivered, and the phone numbers are
// only used as login names — this app sends no SMS.
// Password comes from UAT_SEED_PASSWORD so it is never hard-coded in prod.
type FakeUser = { key: string; name: string; phone: string; email: string; role: "admin" | "user" }

export const UAT_USERS: FakeUser[] = [
  { key: "admin",   name: "แอดมิน ทดสอบ",        phone: "0990000001", email: "admin@uat.chumchon.test",   role: "admin" },
  { key: "seller1", name: "ผู้ขาย ทดสอบหนึ่ง",    phone: "0990000011", email: "seller1@uat.chumchon.test", role: "user" },
  { key: "seller2", name: "ผู้ขาย ทดสอบสอง",      phone: "0990000012", email: "seller2@uat.chumchon.test", role: "user" },
  { key: "seller3", name: "ผู้ขาย ทดสอบสาม",      phone: "0990000013", email: "seller3@uat.chumchon.test", role: "user" },
  { key: "buyer1",  name: "ผู้ซื้อ ทดสอบหนึ่ง",    phone: "0990000021", email: "buyer1@uat.chumchon.test",  role: "user" },
  { key: "buyer2",  name: "ผู้ซื้อ ทดสอบสอง",      phone: "0990000022", email: "buyer2@uat.chumchon.test",  role: "user" },
  { key: "buyer3",  name: "ผู้ซื้อ ทดสอบสาม",      phone: "0990000023", email: "buyer3@uat.chumchon.test",  role: "user" },
  { key: "buyer4",  name: "ผู้ซื้อ ทดสอบสี่",       phone: "0990000024", email: "buyer4@uat.chumchon.test",  role: "user" },
  { key: "buyer5",  name: "ผู้ซื้อ ทดสอบห้า",      phone: "0990000025", email: "buyer5@uat.chumchon.test",  role: "user" },
]

const UAT_COMMUNITIES = [
  {
    slug: "uat-organic", seller: "seller1",
    community: { name: "[UAT] กลุ่มเกษตรอินทรีย์ทดสอบ", province: "เชียงใหม่", district: "สันทราย", subdistrict: "สันทรายหลวง", description: "ชุมชนสำหรับทดสอบระบบ (UAT)" },
    shop: { name: "[UAT] ร้านผักทดสอบ", description: "ร้านทดสอบ — ไม่ใช่ร้านจริง" },
    items: [
      { name: "ผักกาดหอม (ทดสอบ)", price: "89", stock: 50, category: "fresh_produce" },
      { name: "มะเขือเทศ (ทดสอบ)", price: "120", stock: 30, category: "fresh_produce" },
      { name: "น้ำผึ้ง 500ml (ทดสอบ)", price: "350", stock: 5, category: "processed_food" },
    ],
  },
  {
    slug: "uat-seafood", seller: "seller2",
    community: { name: "[UAT] สหกรณ์ประมงทดสอบ", province: "ระยอง", district: "เมือง", subdistrict: "ท่าประดู่", description: "ชุมชนสำหรับทดสอบระบบ (UAT)" },
    shop: { name: "[UAT] ร้านอาหารทะเลทดสอบ", description: "ร้านทดสอบ — ไม่ใช่ร้านจริง" },
    items: [
      { name: "กุ้งสด 500g (ทดสอบ)", price: "280", stock: 40, category: "seafood" },
      { name: "ปลาหมึก 1 กก. (ทดสอบ)", price: "220", stock: 1, category: "seafood" },
    ],
  },
  {
    slug: "uat-herb", seller: "seller3",
    community: { name: "[UAT] วิสาหกิจสมุนไพรทดสอบ", province: "นครราชสีมา", district: "ปากช่อง", subdistrict: "หนองสาหร่าย", description: "ชุมชนสำหรับทดสอบระบบ (UAT)" },
    shop: { name: "[UAT] ร้านสมุนไพรทดสอบ", description: "ร้านทดสอบ — ไม่ใช่ร้านจริง" },
    items: [
      { name: "สบู่ขมิ้น (ทดสอบ)", price: "89", stock: 200, category: "herb" },
      { name: "ชาตะไคร้ 20 ซอง (ทดสอบ)", price: "120", stock: 0, category: "herb" },
    ],
  },
]

// Idempotent: re-running only adds what is missing.
export async function seedUatData(password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  const ids: Record<string, string> = {}
  let createdUsers = 0

  for (const u of UAT_USERS) {
    const existing = await db.query.users.findFirst({ where: eq(users.phone, u.phone) })
    if (existing) {
      ids[u.key] = existing.id
      continue
    }
    const [row] = await db.insert(users)
      .values({ name: u.name, phone: u.phone, email: u.email, passwordHash, role: u.role })
      .returning()
    ids[u.key] = row.id
    createdUsers++
  }

  let createdShops = 0
  for (const c of UAT_COMMUNITIES) {
    if (await db.query.communities.findFirst({ where: eq(communities.slug, c.slug) })) continue
    const [comm] = await db.insert(communities)
      .values({ ...c.community, slug: c.slug, plan: "community", memberCount: 2, isVerified: true })
      .returning()
    await db.insert(communityMembers).values([
      { communityId: comm.id, userId: ids.admin, role: "admin" },
      { communityId: comm.id, userId: ids[c.seller], role: "seller" },
    ])
    const [shop] = await db.insert(shops)
      .values({ ...c.shop, communityId: comm.id, ownerId: ids[c.seller] })
      .returning()
    await db.insert(products).values(c.items.map(i => ({
      ...i,
      shopId: shop.id,
      description: "สินค้าทดสอบสำหรับ UAT",
      images: [],
      status: i.stock > 0 ? ("active" as const) : ("out_of_stock" as const),
    })))
    createdShops++
  }

  return {
    createdUsers,
    createdShops,
    accounts: UAT_USERS.map(u => ({ role: u.key, name: u.name, phone: u.phone, email: u.email })),
  }
}
