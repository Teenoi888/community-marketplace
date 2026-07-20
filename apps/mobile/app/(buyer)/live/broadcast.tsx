import { View, Text, TouchableOpacity, TextInput, FlatList, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useRef, useState } from "react"
import type { RTCPeerConnection as RTCPeerConnectionT, MediaStream as MediaStreamT } from "react-native-webrtc"
import {
  RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCView, mediaDevices, isWebRTCAvailable,
} from "../../../lib/webrtc"
import { api } from "../../../lib/api"
import { useAuthStore } from "../../../lib/store/auth"

const WS_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api").replace(/^http/, "ws").replace("/api", "")
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]

interface ChatMsg { userId: string; userName: string; message: string }
interface ProductResult { id: string; name: string; price: string; images: string[] }

function UnsupportedScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center gap-4 px-6">
      <Text className="text-5xl">📡</Text>
      <Text className="text-white font-semibold text-lg text-center">ฟีเจอร์ไลฟ์สดใช้ไม่ได้ในโหมดนี้</Text>
      <Text className="text-gray-400 text-sm text-center">ต้องเปิดผ่านแอปที่ build มาเฉพาะ (dev/production build) — ใช้งานไม่ได้ใน Expo Go</Text>
      <TouchableOpacity onPress={() => router.back()} className="bg-primary-600 rounded-xl px-6 py-3">
        <Text className="text-white font-semibold">กลับ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default function LiveBroadcastScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore(s => s.user)

  const streamRef = useRef<MediaStreamT | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnectionT>>(new Map())

  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState("")
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [showPinPanel, setShowPinPanel] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [searchResults, setSearchResults] = useState<ProductResult[]>([])
  const [pinnedProducts, setPinnedProducts] = useState<ProductResult[]>([])

  function createPeer(viewerId: string) {
    const pc = new (RTCPeerConnection!)({ iceServers: ICE_SERVERS })
    streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!))
    // @ts-expect-error onicecandidate exists at runtime on react-native-webrtc's RTCPeerConnection
    pc.onicecandidate = (e: any) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ice", isBroadcaster: true, viewerId, candidate: e.candidate }))
      }
    }
    peersRef.current.set(viewerId, pc)
    return pc
  }

  useEffect(() => {
    if (!sessionId || !user || !isWebRTCAvailable) return
    let cancelled = false

    async function start() {
      let stream: MediaStreamT
      try {
        stream = await mediaDevices!.getUserMedia({ video: { facingMode: "user" }, audio: true }) as unknown as MediaStreamT
      } catch {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถเข้าถึงกล้องหรือไมค์ได้")
        return
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      setLocalStreamURL(stream.toURL())

      const ws = new WebSocket(`${WS_URL}/api/live/ws/${sessionId}`)
      wsRef.current = ws

      ws.onopen = () => { ws.send(JSON.stringify({ type: "broadcaster" })); setLive(true) }

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === "viewer_joined") {
          setViewerCount(msg.viewerCount)
          const pc = createPeer(msg.viewerId)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          ws.send(JSON.stringify({ type: "offer", viewerId: msg.viewerId, offer }))
        } else if (msg.type === "answer") {
          const pc = peersRef.current.get(msg.viewerId)
          if (pc) await pc.setRemoteDescription(new (RTCSessionDescription!)(msg.answer))
        } else if (msg.type === "ice") {
          const pc = peersRef.current.get(msg.viewerId)
          if (pc && msg.candidate) await pc.addIceCandidate(new (RTCIceCandidate!)(msg.candidate))
        } else if (msg.type === "viewer_left") {
          setViewerCount(msg.viewerCount)
          peersRef.current.get(msg.viewerId)?.close()
          peersRef.current.delete(msg.viewerId)
        } else if (msg.type === "chat") {
          setChat(prev => [...prev, msg])
        } else if (msg.type === "chat_history") {
          setChat(msg.messages || [])
        }
      }

      ws.onclose = () => setLive(false)
    }

    start()
    return () => {
      cancelled = true
      wsRef.current?.close()
      streamRef.current?.getTracks().forEach(t => t.stop())
      peersRef.current.forEach(pc => pc.close())
      peersRef.current.clear()
    }
  }, [sessionId, user])

  function sendChat() {
    if (!chatInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: "chat", userId: user?.id, userName: user?.name, message: chatInput.trim() }))
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

  async function searchProducts(q: string) {
    setProductSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const r = await api.get(`/products?search=${encodeURIComponent(q)}&limit=6`)
      setSearchResults(r.data.data || [])
    } catch { /* ignore */ }
  }

  function pinProduct(p: ProductResult) {
    if (pinnedProducts.find(x => x.id === p.id)) return
    setPinnedProducts(prev => [...prev, p])
    wsRef.current?.send(JSON.stringify({ type: "pin_product", productId: p.id }))
  }

  function endLive() {
    Alert.alert("สิ้นสุดการ live", "สิ้นสุดการ live สดใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "สิ้นสุด live", style: "destructive", onPress: async () => {
          try { await api.delete(`/live/${sessionId}`) } catch { /* ignore */ }
          router.replace("/(seller)/dashboard")
        },
      },
    ])
  }

  if (!isWebRTCAvailable) return <UnsupportedScreen />

  const Video = RTCView!

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <View className="flex-1 bg-black relative">
        {localStreamURL && (
          <Video streamURL={localStreamURL} style={{ flex: 1 }} objectFit="cover" mirror zOrder={0} />
        )}

        <View className="absolute top-3 left-3 flex-row items-center gap-2">
          {live ? (
            <View className="bg-red-600 rounded-full px-3 py-1"><Text className="text-white text-xs font-bold">🔴 LIVE</Text></View>
          ) : (
            <View className="bg-gray-700 rounded-full px-3 py-1"><Text className="text-gray-300 text-xs">กำลังเชื่อมต่อ...</Text></View>
          )}
          <View className="bg-black/50 rounded-full px-3 py-1"><Text className="text-white text-xs">👁️ {viewerCount}</Text></View>
        </View>

        <TouchableOpacity onPress={() => setShowPinPanel(v => !v)} className="absolute top-3 right-3 bg-yellow-500 rounded-full px-3 py-1.5">
          <Text className="text-black text-xs font-bold">📌 ปักหมุดสินค้า</Text>
        </TouchableOpacity>

        <View className="absolute bottom-6 left-0 right-0 flex-row items-center justify-center gap-4">
          <TouchableOpacity onPress={toggleMic} className={`w-12 h-12 rounded-full items-center justify-center ${micOn ? "bg-gray-700" : "bg-red-600"}`}>
            <Text className="text-white">{micOn ? "🎙️" : "🔇"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={endLive} className="w-16 h-16 rounded-full bg-red-600 items-center justify-center">
            <Text className="text-white text-2xl">✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleCam} className={`w-12 h-12 rounded-full items-center justify-center ${camOn ? "bg-gray-700" : "bg-red-600"}`}>
            <Text className="text-white">{camOn ? "📹" : "🚫"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="h-56 bg-gray-900">
        {showPinPanel ? (
          <View className="p-3 flex-1">
            <TextInput
              className="bg-gray-800 rounded-lg px-3 py-2 text-white text-sm mb-2"
              placeholder="ค้นหาสินค้า..." placeholderTextColor="#9ca3af"
              value={productSearch} onChangeText={searchProducts}
            />
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => pinProduct(item)} className="flex-row items-center gap-2 py-2">
                  <Text className="flex-1 text-white text-sm" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-gray-400 text-xs">฿{Number(item.price).toLocaleString()}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <>
            <FlatList
              data={chat}
              keyExtractor={(_, i) => String(i)}
              contentContainerClassName="px-4 py-2"
              renderItem={({ item }) => (
                <Text className="text-sm mb-1"><Text className="font-semibold text-primary-300">{item.userName}: </Text><Text className="text-gray-200">{item.message}</Text></Text>
              )}
            />
            <View className="flex-row items-center gap-2 px-3 py-2 border-t border-gray-800">
              <TextInput
                className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-white text-sm"
                placeholder="พิมพ์ข้อความ..." placeholderTextColor="#9ca3af"
                value={chatInput} onChangeText={setChatInput} onSubmitEditing={sendChat}
              />
              <TouchableOpacity onPress={sendChat} className="bg-primary-600 rounded-full w-9 h-9 items-center justify-center">
                <Text className="text-white">➤</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}
