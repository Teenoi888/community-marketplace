"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"
import { Radio, Users, Mic, MicOff, Video, VideoOff, X, Send, Package, Pin } from "lucide-react"
import { toast } from "sonner"

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api")
  .replace(/^http/, "ws")
  .replace("/api", "")

interface ChatMsg { userId: string; userName: string; message: string; createdAt: string }
interface PinnedProduct { id: string; name: string; price: string; images: string[] }

export default function BroadcastPage() {
  const params = useSearchParams()
  const router = useRouter()
  const sessionId = params.get("id") || ""
  const user = useAuthStore(s => s.user)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  const [live, setLive] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState("")
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [searchResults, setSearchResults] = useState<PinnedProduct[]>([])
  const [showPinPanel, setShowPinPanel] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll chat to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chat])

  const createPeer = useCallback((viewerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
    streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!))
    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ice", isBroadcaster: true, viewerId, candidate: e.candidate }))
      }
    }
    peersRef.current.set(viewerId, pc)
    return pc
  }, [])

  useEffect(() => {
    if (!sessionId || !user) return

    let started = false

    async function startBroadcast() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        streamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true
        }
        started = true
      } catch {
        toast.error("ไม่สามารถเข้าถึงกล้องหรือไมค์ได้")
        return
      }

      const ws = new WebSocket(`${WS_URL}/api/live/ws/${sessionId}`)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "broadcaster" }))
        setLive(true)
      }

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data)

        if (msg.type === "viewer_joined") {
          setViewerCount(msg.viewerCount)
          // Create offer for new viewer
          const pc = createPeer(msg.viewerId)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          ws.send(JSON.stringify({ type: "offer", viewerId: msg.viewerId, offer }))
        }

        else if (msg.type === "answer") {
          const pc = peersRef.current.get(msg.viewerId)
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.answer))
        }

        else if (msg.type === "ice") {
          const pc = peersRef.current.get(msg.viewerId)
          if (pc && msg.candidate) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
        }

        else if (msg.type === "viewer_left") {
          setViewerCount(msg.viewerCount)
          const pc = peersRef.current.get(msg.viewerId)
          pc?.close()
          peersRef.current.delete(msg.viewerId)
        }

        else if (msg.type === "chat") {
          setChat(prev => [...prev, msg])
        }

        else if (msg.type === "chat_history") {
          setChat(msg.messages || [])
        }
      }

      ws.onclose = () => setLive(false)
    }

    startBroadcast()

    return () => {
      wsRef.current?.close()
      if (started) {
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
      peersRef.current.forEach(pc => pc.close())
      peersRef.current.clear()
    }
  }, [sessionId, user, createPeer])

  function sendChat() {
    if (!chatInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({
      type: "chat", userId: user?.id, userName: user?.name, message: chatInput.trim()
    }))
    setChatInput("")
  }

  function toggleMic() {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn })
    setMicOn(v => !v)
  }

  function toggleCam() {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !camOn })
    setCamOn(v => !v)
  }

  async function endLive() {
    if (!confirm("สิ้นสุดการ live สดใช่ไหม?")) return
    try { await api.delete(`/live/${sessionId}`) } catch {}
    router.push("/dashboard")
  }

  async function searchProducts(q: string) {
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const r = await api.get("/products", { params: { search: q, limit: 6 } })
      setSearchResults(r.data.data || [])
    } catch {}
  }

  function pinProduct(p: PinnedProduct) {
    if (pinnedProducts.find(x => x.id === p.id)) return
    const next = [...pinnedProducts, p]
    setPinnedProducts(next)
    wsRef.current?.send(JSON.stringify({ type: "pin_product", productId: p.id }))
    toast.success(`ปักหมุด "${p.name}" แล้ว`)
  }

  function unpinAll() {
    setPinnedProducts([])
    wsRef.current?.send(JSON.stringify({ type: "pin_product", productId: null }))
  }

  if (!user) return <div className="p-8 text-center text-gray-500">กรุณาเข้าสู่ระบบก่อน</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col md:flex-row">
      {/* Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video ref={localVideoRef} autoPlay playsInline className="w-full h-full object-cover max-h-[60vh] md:max-h-screen" />

        {/* Overlays */}
        <div className="absolute top-4 left-4 flex items-center gap-3">
          {live ? (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full">กำลังเชื่อมต่อ...</span>
          )}
          <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
            <Users className="w-3 h-3" /> {viewerCount} คน
          </span>
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${micOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"} transition-colors`}>
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button onClick={endLive}
            className="w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-lg">
            <X className="w-7 h-7" />
          </button>
          <button onClick={toggleCam}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${camOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"} transition-colors`}>
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Pin product button */}
        <button onClick={() => setShowPinPanel(v => !v)}
          className="absolute top-4 right-4 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
          <Pin className="w-3.5 h-3.5" /> ปักหมุดสินค้า
        </button>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-80 bg-gray-900 flex flex-col max-h-[40vh] md:max-h-screen">

        {/* Pin panel */}
        {showPinPanel && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">ปักหมุดสินค้า</span>
              {pinnedProducts.length > 0 && (
                <button onClick={unpinAll} className="text-xs text-red-400 hover:text-red-300">ลบทั้งหมด</button>
              )}
            </div>
            <input
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value) }}
              placeholder="ค้นหาสินค้า..."
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
            />
            {searchResults.map(p => (
              <button key={p.id} onClick={() => pinProduct(p)}
                className="w-full flex items-center gap-2 p-2 hover:bg-gray-700 rounded-lg text-left">
                <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.name}</div>
                  <div className="text-xs text-gray-400">฿{Number(p.price).toLocaleString()}</div>
                </div>
              </button>
            ))}
            {pinnedProducts.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-1">ปักหมุดอยู่:</p>
                {pinnedProducts.map(p => (
                  <div key={p.id} className="text-xs text-yellow-300 flex items-center gap-1">
                    <Pin className="w-3 h-3" /> {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
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
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button onClick={sendChat} className="bg-primary-600 hover:bg-primary-500 rounded-lg p-2 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
