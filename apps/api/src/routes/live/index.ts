import type { FastifyInstance } from "fastify"
import { requireAuth } from "../../middleware/auth.js"
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

interface ChatMsg { userId: string; userName: string; message: string; createdAt: string }
interface ViewerConn { ws: any; userId: string; userName: string }

interface SessionState {
  broadcaster: any | null
  viewers: Map<string, ViewerConn>
  chatHistory: ChatMsg[]
  pinnedProducts: string[]
}

const sessions = new Map<string, SessionState>()

function getOrCreate(id: string): SessionState {
  if (!sessions.has(id)) {
    sessions.set(id, { broadcaster: null, viewers: new Map(), chatHistory: [], pinnedProducts: [] })
  }
  return sessions.get(id)!
}

function sendAll(session: SessionState, msg: object, exclude?: any) {
  const str = JSON.stringify(msg)
  if (session.broadcaster && session.broadcaster !== exclude && session.broadcaster.readyState === 1) {
    session.broadcaster.send(str)
  }
  session.viewers.forEach(v => {
    if (v.ws !== exclude && v.ws.readyState === 1) v.ws.send(str)
  })
}

export async function liveRoutes(app: FastifyInstance) {

  // POST /live — seller starts a session
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { title } = request.body as { title: string }
    if (!title?.trim()) return reply.code(400).send({ success: false, error: "กรุณาใส่ชื่อ live" })

    const shopRow = await sql`SELECT id FROM shops WHERE owner_id = ${userId} LIMIT 1`
    if (!shopRow.length) return reply.code(403).send({ success: false, error: "คุณยังไม่มีร้าน" })

    await sql`UPDATE live_sessions SET status='ended', ended_at=NOW() WHERE seller_id=${userId} AND status='live'`
    const [session] = await sql`
      INSERT INTO live_sessions (shop_id, seller_id, title)
      VALUES (${shopRow[0].id}, ${userId}, ${title.trim()})
      RETURNING *
    `
    return reply.code(201).send({ success: true, data: session })
  })

  // GET /live — active sessions list
  app.get("/", async () => {
    const rows = await sql`
      SELECT ls.id, ls.title, ls.viewer_count, ls.started_at, ls.pinned_products,
             s.name as shop_name, u.name as seller_name, u.avatar_url, c.slug as community_slug
      FROM live_sessions ls
      JOIN shops s ON s.id = ls.shop_id
      JOIN communities c ON c.id = s.community_id
      JOIN users u ON u.id = ls.seller_id
      WHERE ls.status = 'live'
      ORDER BY ls.viewer_count DESC, ls.started_at DESC
    `
    return { success: true, data: rows }
  })

  // GET /live/:id — session info
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const rows = await sql`
      SELECT ls.*, s.name as shop_name, u.name as seller_name, u.avatar_url
      FROM live_sessions ls
      JOIN shops s ON s.id = ls.shop_id
      JOIN users u ON u.id = ls.seller_id
      WHERE ls.id = ${id}
    `
    if (!rows.length) return reply.code(404).send({ success: false, error: "ไม่พบ live" })
    return { success: true, data: rows[0] }
  })

  // DELETE /live/:id — end session
  app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    await sql`UPDATE live_sessions SET status='ended', ended_at=NOW() WHERE id=${id} AND seller_id=${userId}`
    const session = sessions.get(id)
    if (session) {
      sendAll(session, { type: "session_ended" })
      sessions.delete(id)
    }
    return { success: true }
  })

  // WebSocket signaling /live/ws/:id
  app.get("/ws/:id", { websocket: true }, (connection, request) => {
    const { id } = request.params as { id: string }
    const ws = connection.socket
    const session = getOrCreate(id)
    let role: "broadcaster" | "viewer" | null = null
    let viewerId: string | null = null

    ws.on("message", async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString())

        if (msg.type === "broadcaster") {
          role = "broadcaster"
          session.broadcaster = ws
          ws.send(JSON.stringify({ type: "chat_history", messages: session.chatHistory }))
        }

        else if (msg.type === "viewer") {
          role = "viewer"
          viewerId = msg.viewerId || crypto.randomUUID()
          session.viewers.set(viewerId as string, { ws, userId: msg.userId || "", userName: msg.userName || "ผู้ชม" })
          const count = session.viewers.size
          sql`UPDATE live_sessions SET viewer_count=${count} WHERE id=${id}`.catch(() => {})
          ws.send(JSON.stringify({ type: "chat_history", messages: session.chatHistory }))
          if (session.pinnedProducts.length) {
            ws.send(JSON.stringify({ type: "pinned_products", productIds: session.pinnedProducts }))
          }
          if (session.broadcaster?.readyState === 1) {
            session.broadcaster.send(JSON.stringify({ type: "viewer_joined", viewerId, viewerCount: count }))
          }
        }

        // WebRTC signaling
        else if (msg.type === "offer") {
          // broadcaster → specific viewer
          const v = session.viewers.get(msg.viewerId)
          if (v?.ws.readyState === 1) v.ws.send(JSON.stringify({ type: "offer", offer: msg.offer }))
        }

        else if (msg.type === "answer") {
          // viewer → broadcaster
          if (session.broadcaster?.readyState === 1) {
            session.broadcaster.send(JSON.stringify({ type: "answer", answer: msg.answer, viewerId: msg.viewerId }))
          }
        }

        else if (msg.type === "ice") {
          if (msg.isBroadcaster) {
            const v = session.viewers.get(msg.viewerId)
            if (v?.ws.readyState === 1) v.ws.send(JSON.stringify({ type: "ice", candidate: msg.candidate }))
          } else {
            if (session.broadcaster?.readyState === 1) {
              session.broadcaster.send(JSON.stringify({ type: "ice", candidate: msg.candidate, viewerId: msg.viewerId }))
            }
          }
        }

        else if (msg.type === "chat") {
          const chatMsg: ChatMsg = {
            userId: msg.userId, userName: msg.userName,
            message: String(msg.message).slice(0, 200),
            createdAt: new Date().toISOString(),
          }
          session.chatHistory.push(chatMsg)
          if (session.chatHistory.length > 100) session.chatHistory.shift()
          sendAll(session, { type: "chat", ...chatMsg })
        }

        else if (msg.type === "pin_product" && role === "broadcaster") {
          if (msg.productId) {
            if (!session.pinnedProducts.includes(msg.productId)) session.pinnedProducts.push(msg.productId)
          } else {
            session.pinnedProducts = []
          }
          sendAll(session, { type: "pinned_products", productIds: session.pinnedProducts })
          sql`UPDATE live_sessions SET pinned_products=${JSON.stringify(session.pinnedProducts)}::jsonb WHERE id=${id}`.catch(() => {})
        }

      } catch (e) {
        // ignore parse errors
      }
    })

    ws.on("close", async () => {
      if (role === "broadcaster") {
        session.broadcaster = null
        sendAll(session, { type: "session_ended" })
        await sql`UPDATE live_sessions SET status='ended', ended_at=NOW() WHERE id=${id} AND status='live'`.catch(() => {})
        sessions.delete(id)
      } else if (role === "viewer" && viewerId) {
        session.viewers.delete(viewerId)
        const count = session.viewers.size
        sql`UPDATE live_sessions SET viewer_count=${count} WHERE id=${id}`.catch(() => {})
        if (session.broadcaster?.readyState === 1) {
          session.broadcaster.send(JSON.stringify({ type: "viewer_left", viewerId, viewerCount: count }))
        }
      }
    })
  })
}
