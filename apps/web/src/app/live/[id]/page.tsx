"use client"
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"
import { useCartStore } from "@/lib/store/cart"
import { Radio, Users, Send, ShoppingCart, Pin, ArrowLeft, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api")
  .replace(/^http/, "ws")
  .replace("/api", "")

interface ChatMsg { userId: string; userName: string; message: string; createdAt: string }
interface SessionInfo { id: string; title: string; shop_name: string; seller_name: string; viewer_count: number; status: string }
interface PinnedProduct { id: string; name: string; price: string; images: string[]; stock: number; shop_id: string; shop_name: string }

export default function ViewerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const addToCart = useCartStore(s => s.addItem)

  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const viewerIdRef = useRef(crypto.randomUUID())

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState("")
  const [viewerCount, setViewerCount] = useState(0)
  const [ended, setEnded] = useState(false)
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [iceState, setIceState] = useState<string>("connecting")
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chat])

  // Load session info
  useEffect(() => {
    api.get(`/live/${id}`).then(r => {
      const s = r.data.data
      setSession(s)
      setViewerCount(s.viewer_count)
      if (s.status !== "live") setEnded(true)
    }).catch(() => setEnded(true))
  }, [id])

  // Load pinned products
  async function loadPinnedProducts(productIds: string[]) {
    if (!productIds.length) { setPinnedProducts([]); return }
    try {
      const results = await Promise.all(productIds.map(pid => api.get(`/products/${pid}`).then(r => r.data.data).catch(() => null)))
      setPinnedProducts(results.filter(Boolean))
    } catch {}
  }

  useEffect(() => {
    if (ended) return

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" },
      ]
    })
    pcRef.current = pc
    setIceState("connecting")

    // Create MediaStream upfront — desktop Chrome sometimes has empty e.streams[0]
    const remoteStream = new MediaStream()

    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState)
    }

    pc.ontrack = (e) => {
      const video = remoteVideoRef.current
      if (!video) return
      if (e.streams && e.streams[0]) {
        video.srcObject = e.streams[0]
      } else {
        remoteStream.addTrack(e.track)
        video.srcObject = remoteStream
      }
      // Start muted — Chrome allows muted autoplay on all platforms
      video.muted = true
      video.play().then(() => setIsPlaying(true)).catch(() => {})
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ice", isBroadcaster: false, viewerId: viewerIdRef.current, candidate: e.candidate }))
      }
    }

    const ws = new WebSocket(`${WS_URL}/api/live/ws/${id}`)
    wsRef.current = ws

    ws.onopen = () => {
      // Use getState() so this effect doesn't re-run when user changes
      const u = useAuthStore.getState().user
      ws.send(JSON.stringify({
        type: "viewer",
        viewerId: viewerIdRef.current,
        userId: u?.id || "",
        userName: u?.name || "ผู้ชม",
      }))
    }

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        ws.send(JSON.stringify({ type: "answer", answer, viewerId: viewerIdRef.current }))
      }

      else if (msg.type === "ice") {
        if (msg.candidate) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
      }

      else if (msg.type === "chat") {
        setChat(prev => [...prev, msg])
      }

      else if (msg.type === "chat_history") {
        setChat(msg.messages || [])
      }

      else if (msg.type === "pinned_products") {
        await loadPinnedProducts(msg.productIds || [])
      }

      else if (msg.type === "viewer_joined") {
        setViewerCount(msg.viewerCount)
      }

      else if (msg.type === "session_ended") {
        setEnded(true)
        toast.info("ไลฟ์สิ้นสุดแล้ว")
      }
    }

    ws.onclose = () => {}

    return () => {
      ws.close()
      pc.close()
    }
  }, [id, ended])   // ไม่ใส่ user — ใช้ getState() ใน onopen แทน เพื่อป้องกัน re-connect 2 รอบ

  function sendChat() {
    if (!chatInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({
      type: "chat",
      userId: user?.id || "",
      userName: user?.name || "ผู้ชม",
      message: chatInput.trim(),
    }))
    setChatInput("")
  }

  function handleAddToCart(p: PinnedProduct) {
    addToCart(
      { id: p.id, name: p.name, price: Number(p.price), stock: p.stock ?? 99, images: p.images || [] },
      p.shop_id || "",
      p.shop_name || session?.shop_name || ""
    )
    toast.success(`เพิ่ม "${p.name}" ลงตะกร้าแล้ว`)
  }

  if (ended) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-4">
        <Radio className="w-16 h-16 text-gray-600" />
        <h2 className="text-xl font-semibold">ไลฟ์สิ้นสุดแล้ว</h2>
        <Link href="/live" className="btn-primary">ดูไลฟ์อื่น</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row">
      {/* Video */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover max-h-[60vh] md:max-h-screen" />

        {/* ICE connecting overlay */}
        {!isPlaying && iceState !== "failed" && iceState !== "disconnected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm">กำลังเชื่อมต่อ...</span>
            </div>
          </div>
        )}

        {/* ICE failed overlay */}
        {(iceState === "failed" || iceState === "disconnected") && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <span className="text-white text-sm">ไม่สามารถเชื่อมต่อวิดีโอได้</span>
              <button
                onClick={() => window.location.reload()}
                className="bg-primary-600 hover:bg-primary-500 text-white text-sm px-4 py-2 rounded-lg"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {/* Unmute button — always muted on start so autoplay works */}
        {isPlaying && (
          <button
            onClick={() => {
              const video = remoteVideoRef.current
              if (!video) return
              video.muted = !video.muted
              setIsMuted(video.muted)
            }}
            className="absolute bottom-16 right-4 bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded-full flex items-center gap-2 text-sm transition-colors z-10"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isMuted ? "เปิดเสียง" : "ปิดเสียง"}
          </button>
        )}

        {/* Top bar */}
        <div className="absolute top-4 left-4 flex items-center gap-3">
          <Link href="/live" className="bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="bg-black/50 rounded-full px-3 py-1.5">
            <span className="text-sm font-semibold">{session?.shop_name}</span>
          </div>
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
          </span>
          <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
            <Users className="w-3 h-3" /> {viewerCount}
          </span>
        </div>

        {/* Title */}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-sm font-semibold drop-shadow">{session?.title}</p>
          <p className="text-xs text-gray-300">{session?.seller_name}</p>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-80 bg-gray-900 flex flex-col max-h-[40vh] md:max-h-screen">

        {/* Pinned Products */}
        {pinnedProducts.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1 mb-2">
              <Pin className="w-3 h-3" /> สินค้าแนะนำ
            </p>
            <div className="space-y-2">
              {pinnedProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-2">
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500"><ShoppingCart className="w-4 h-4" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-primary-400">฿{Number(p.price).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleAddToCart(p)}
                    className="bg-primary-600 hover:bg-primary-500 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors flex-shrink-0">
                    <ShoppingCart className="w-3 h-3" /> ใส่ตะกร้า
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {chat.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">ยังไม่มีข้อความ เป็นคนแรกที่แสดงความคิดเห็น!</p>
          )}
          {chat.map((m, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold text-primary-300">{m.userName}: </span>
              <span className="text-gray-200">{m.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="p-3 border-t border-gray-700 flex gap-2">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
            placeholder={user ? "พิมพ์ข้อความ..." : "ล็อกอินเพื่อแชท"}
            disabled={!user}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-40"
          />
          <button onClick={sendChat} disabled={!user}
            className="bg-primary-600 hover:bg-primary-500 rounded-lg p-2 transition-colors disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
