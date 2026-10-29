// Shared set-up for the payments integration tests (payments.security.test.ts, payments.integrity.test.ts).
//
// Runs the REAL route code through Fastify's inject() against a REAL Postgres database, with local mock
// servers standing in for Xendit and Omise (nothing leaves the machine). The tests insert and delete rows,
// so DATABASE_URL must point at a THROWAWAY database built from apps/api/src/db/migrations/*.sql (in order).
import http from "node:http"
import type { AddressInfo } from "node:net"
import Fastify, { type FastifyInstance } from "fastify"
import jwt from "@fastify/jwt"
import { eq, gte, inArray } from "drizzle-orm"

export const HAS_DB = !!process.env.DATABASE_URL

export type Mock = { url: string; requests: { method: string; url: string; body: any }[]; close: () => Promise<void> }

export function startMock(respond: (req: { method: string; url: string; body: any }) => { status: number; json: any }): Promise<Mock> {
  const requests: Mock["requests"] = []
  const server = http.createServer((req, res) => {
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      const parsed = { method: req.method!, url: req.url!, body: raw ? JSON.parse(raw) : undefined }
      requests.push(parsed)
      const { status, json } = respond(parsed)
      res.writeHead(status, { "content-type": "application/json" })
      res.end(JSON.stringify(json))
    })
  })
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        requests,
        close: () => new Promise((r) => server.close(() => r())),
      }),
    ),
  )
}

let seq = 0
/** A fresh id for a fake gateway object, unique per call (gateways never reuse ids, and we de-duplicate on them). */
export const uniqueId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 8)}`

export async function createHarness() {
  const startedAt = new Date()
  const omiseCharges: Record<string, any> = {}
  const xendit = await startMock(() => ({ status: 200, json: { id: "qr_mock", qr_string: "00020101021226mock" } }))
  const omise = await startMock((r) => {
    const id = r.url.split("/charges/")[1]
    return omiseCharges[id] ? { status: 200, json: omiseCharges[id] } : { status: 404, json: { object: "error" } }
  })
  // module-level constants in payments/index.ts read these when it is first imported
  process.env.XENDIT_API_BASE = xendit.url
  process.env.OMISE_API_BASE = omise.url
  process.env.JWT_SECRET ||= "test-secret"

  const { db } = await import("../../db/index.js")
  const S = await import("../../db/schema.js")
  const { paymentRoutes } = await import("./index.js")

  const app: FastifyInstance = Fastify()
  await app.register(jwt, { secret: process.env.JWT_SECRET! })
  await app.register(paymentRoutes, { prefix: "/api/payments" })
  await app.ready()

  const phone = () => `0${Math.floor(1e9 + Math.random() * 8e9)}`
  const tag = uniqueId("pt")
  const [buyer] = await db.insert(S.users).values({ name: "Test Buyer", phone: phone() }).returning()
  const [other] = await db.insert(S.users).values({ name: "Test Other", phone: phone() }).returning()
  const [community] = await db.insert(S.communities).values({ name: tag, province: "t", district: "t", subdistrict: "t", slug: tag }).returning()
  const [shop] = await db.insert(S.shops).values({ communityId: community.id, ownerId: other.id, name: tag }).returning()
  const buyerToken = app.jwt.sign({ userId: buyer.id })
  const otherToken = app.jwt.sign({ userId: other.id })

  const createdOrders: string[] = []
  async function makeOrder(total = "5000.00", status: "pending_payment" | "paid" | "cancelled" = "pending_payment") {
    const [o] = await db.insert(S.orders).values({
      buyerId: buyer.id, shopId: shop.id, total, status,
      deliveryAddress: { name: "t", phone: "t", address: "t", district: "t", subdistrict: "t", province: "t", zipCode: "10000" },
    }).returning()
    createdOrders.push(o.id)
    return o
  }

  const savedEnv: Record<string, string | undefined> = {}
  const setEnv = (k: string, v: string | undefined) => {
    if (!(k in savedEnv)) savedEnv[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }

  return {
    app, db, S, xendit, omise, omiseCharges, buyerToken, otherToken, buyerId: buyer.id, otherId: other.id, shopId: shop.id,
    makeOrder, setEnv,
    orderRow: async (id: string) => (await db.select().from(S.orders).where(eq(S.orders.id, id)))[0],
    paymentRows: async (orderId: string) => db.select().from(S.payments).where(eq(S.payments.orderId, orderId)),
    eventRows: async (orderId: string) => db.select().from(S.paymentEvents).where(eq(S.paymentEvents.orderId, orderId)),
    call: (method: "GET" | "POST", url: string, token?: string, payload?: any, headers: Record<string, string> = {}) =>
      app.inject({ method, url: `/api/payments${url}`, payload, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } }),
    /** call between tests: forget mock traffic and restore any env vars a test changed */
    reset() {
      xendit.requests.length = 0
      omise.requests.length = 0
      for (const k of Object.keys(omiseCharges)) delete omiseCharges[k]
      for (const [k, v] of Object.entries(savedEnv)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
      for (const k of Object.keys(savedEnv)) delete savedEnv[k]
    },
    async teardown() {
      await db.delete(S.paymentEvents).where(gte(S.paymentEvents.receivedAt, startedAt))
      if (createdOrders.length) {
        await db.delete(S.payments).where(inArray(S.payments.orderId, createdOrders))
        await db.delete(S.orders).where(inArray(S.orders.id, createdOrders))
      }
      await db.delete(S.shops).where(eq(S.shops.id, shop.id))
      await db.delete(S.communities).where(eq(S.communities.id, community.id))
      await db.delete(S.users).where(inArray(S.users.id, [buyer.id, other.id]))
      await app.close()
      await xendit.close()
      await omise.close()
    },
  }
}

export type Harness = Awaited<ReturnType<typeof createHarness>>
