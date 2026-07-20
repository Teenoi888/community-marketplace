import { View, Text, TouchableOpacity, TextInput, FlatList, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useRef, useState } from "react"
import type { RTCPeerConnection as RTCPeerConnectionT, MediaStream as MediaStreamT } from "react-native-webrtc"
import {
  RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCView, isWebRTCAvailable,
} from "../../../lib/webrtc"
import { api } from "../../../lib/api"
import { useAuthStore } from "../../../lib/store/auth"
import { useCartStore } from "../../../lib/store/cart"

const WS_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api").replace(/^http/, "ws").replace("/api", "")

// Same fallback the web app uses when no TURN server is configured — STUN
// alone frequently fails to traverse strict/carrier-grade NAT on mobile
// networks. If viewers report black screens on cellular data, that's why;
// a TURN server (see apps/web's turn-credentials route) is the fix.
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]

interface ChatMsg { userId: string; userName: string; message: string }
interface SessionInfo { id: string; title: string; shop_name: string; viewer_count: number; status: string }
interface PinnedProduct { id: string; name: string; price: string; images: string[]; stock: number; shop_id: string; shop_name: string }

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

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

export default function LiveViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore(s => s.user)
  const addToCart = useCartStore(s => s.addItem)

  const wsRef = useRef<WebSocket | null>(null)
  const pcRef = useRef<RTCPeerConnectionT | null>(null)
  const viewerIdRef = useRef(uuid())

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [remoteStreamURL, setRemoteStreamURL] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState("")
  const [viewerCount, setViewerCount] = useState(0)
  const [ended, setEnded] = useState(false)
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])

  useEffect(() => {
    api.get(`/live/${id}`).then(r => {
      setSession(r.data.data)
      setViewerCount(r.data.data.viewer_count)
      if (r.data.data.status !== "live") setEnded(true)
    }).catch(() => setEnded(true))
  }, [id])

  async function loadPinnedProducts(productIds: string[]) {
    if (!productIds.length) { setPinnedProducts([]); return }
    const results = await Promise.all(productIds.map(pid => api.get(`/products/${pid}`).then(r => r.data.data).catch(() => null)))
    setPinnedProducts(results.filter(Boolean))
  }

  useEffect(() => {
    if (ended || !isWebRTCAvailable) return

    const pc = new (RTCPeerConnection!)({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    // @ts-expect-error react-native-webrtc's ontrack event isn't in the base RN WebRTC types
    pc.ontrack = (e: any) => {
      const stream = e.streams?.[0] as MediaStreamT | undefined
      if (stream) setRemoteStreamURL(stream.toURL())
    }

    // @ts-expect-error same as above — onicecandidate exists at runtime
    pc.onicecandidate = (e: any) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ice", isBroadcaster: false, viewerId: viewerIdRef.current, candidate: e.candidate }))
      }
    }

    const ws = new WebSocket(`${WS_URL}/api/live/ws/${id}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "viewer", viewerId: viewerIdRef.current, userId: user?.id || "", userName: user?.name || "ผู้ชม" }))
    }

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === "offer") {
        await pc.setRemoteDescription(new (RTCSessionDescription!)(msg.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        ws.send(JSON.stringify({ type: "answer", answer, viewerId: viewerIdRef.current }))
      } else if (msg.type === "ice") {
        if (msg.candidate) await pc.addIceCandidate(new (RTCIceCandidate!)(msg.candidate))
      } else if (msg.type === "chat") {
        setChat(prev => [...prev, msg])
      } else if (msg.type === "chat_history") {
        setChat(msg.messages || [])
      } else if (msg.type === "pinned_products") {
        loadPinnedProducts(msg.productIds || [])
      } else if (msg.type === "viewer_joined") {
        setViewerCount(msg.viewerCount)
      } else if (msg.type === "session_ended") {
        setEnded(true)
      }
    }

    return () => {
      wsRef.current?.close()
      pcRef.current?.close()
    }
  }, [id, ended])

  function sendChat() {
    if (!chatInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: "chat", userId: user?.id || "", userName: user?.name || "ผู้ชม", message: chatInput.trim() }))
    setChatInput("")
  }

  function handleAddToCart(p: PinnedProduct) {
    addToCart({ id: p.id, name: p.name, price: Number(p.price), stock: p.stock ?? 99, images: p.images || [] }, p.shop_id || "", p.shop_name || session?.shop_name || "")
    Alert.alert("สำเร็จ", `เพิ่ม "${p.name}" ลงตะกร้าแล้ว`)
  }

  if (!isWebRTCAvailable) return <UnsupportedScreen />

  if (ended) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center gap-4">
        <Text className="text-5xl">📡</Text>
        <Text className="text-white font-semibold text-lg">ไลฟ์สิ้นสุดแล้ว</Text>
        <TouchableOpacity onPress={() => router.replace("/(buyer)/live")} className="bg-primary-600 rounded-xl px-6 py-3">
          <Text className="text-white font-semibold">ดูไลฟ์อื่น</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const Video = RTCView!

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <View className="flex-1 bg-black relative">
        {remoteStreamURL ? (
          <Video streamURL={remoteStreamURL} style={{ flex: 1 }} objectFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center"><Text className="text-gray-400">กำลังเชื่อมต่อ...</Text></View>
        )}

        <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-full bg-black/50 items-center justify-center">
            <Text className="text-white">‹</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <View className="bg-red-600 rounded-full px-3 py-1"><Text className="text-white text-xs font-bold">LIVE</Text></View>
            <View className="bg-black/50 rounded-full px-3 py-1"><Text className="text-white text-xs">👁️ {viewerCount}</Text></View>
          </View>
        </View>

        {pinnedProducts.length > 0 && (
          <View className="absolute bottom-3 left-3 right-3 gap-2">
            {pinnedProducts.map(p => (
              <View key={p.id} className="bg-white/95 rounded-2xl p-3 flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="font-medium text-gray-900 text-sm" numberOfLines={1}>📌 {p.name}</Text>
                  <Text className="text-primary-600 font-bold text-sm">฿{Number(p.price).toLocaleString()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleAddToCart(p)} className="bg-primary-600 rounded-lg px-3 py-2">
                  <Text className="text-white text-xs font-semibold">หยิบใส่ตะกร้า</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="h-52 bg-gray-900">
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
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#9ca3af"
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={sendChat}
          />
          <TouchableOpacity onPress={sendChat} className="bg-primary-600 rounded-full w-9 h-9 items-center justify-center">
            <Text className="text-white">➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
