import { View, Text, TouchableOpacity, Image, ActivityIndicator, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useRef, useState } from "react"
import * as ImagePicker from "expo-image-picker"
import { api } from "../../../lib/api"

type PaymentMethod = "promptpay" | "bank_transfer" | "credit_card"

interface OrderData { id: string; total: string; status: string }
interface GatewayInfo { configured: boolean; cardGateway: string | null }

function fmt(n: number) {
  return `฿${n.toLocaleString()}`
}

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://cmweb-production-5bff.up.railway.app"

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [method, setMethod] = useState<PaymentMethod>("promptpay")
  const [qrData, setQrData] = useState<{ qrImage?: string; promptpayId?: string } | null>(null)
  const [slipUri, setSlipUri] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(r => setOrder(r.data.data)).catch(() => {})
    api.get("/payments/gateway-info").then(r => setGatewayInfo(r.data.data)).catch(() => {})
  }, [orderId])

  useEffect(() => {
    if (verified) return
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/orders/${orderId}`)
        if (r.data.data.status === "paid") {
          setVerified(true)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch { /* ignore */ }
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [orderId, verified])

  useEffect(() => {
    if (order && method === "promptpay" && !qrData) generateQR()
  }, [order, method])

  async function generateQR() {
    if (!order) return
    setLoading(true)
    try {
      const r = await api.post("/payments/promptpay-qr", { amount: Number(order.total), orderId: order.id })
      setQrData(r.data.data)
    } finally {
      setLoading(false)
    }
  }

  async function pickSlip() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!result.canceled) setSlipUri(result.assets[0].uri)
  }

  async function submitSlip() {
    if (!slipUri || !order) return
    setLoading(true)
    setVerifying(true)
    try {
      const formData = new FormData()
      formData.append("file", { uri: slipUri, name: "slip.jpg", type: "image/jpeg" } as any)
      formData.append("folder", "slips")
      const uploadRes = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
      await api.post("/payments", { orderId: order.id, method: "bank_transfer", slipUrl: uploadRes.data.data.url })
    } catch {
      setVerifying(false)
    } finally {
      setLoading(false)
    }
  }

  async function submitDemo() {
    if (!order) return
    setDemoLoading(true)
    try {
      await api.post("/payments/demo", { orderId: order.id })
      setVerified(true)
    } finally {
      setDemoLoading(false)
    }
  }

  if (verified) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-6xl mb-4">✅</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2">ชำระเงินสำเร็จ!</Text>
        <Text className="text-gray-500 mb-6 text-center">ผู้ขายได้รับออเดอร์ของคุณแล้ว กำลังเตรียมสินค้า</Text>
        <TouchableOpacity onPress={() => router.replace("/(buyer)/orders")} className="bg-primary-600 rounded-xl py-3.5 w-full items-center">
          <Text className="text-white font-bold">ดูสถานะออเดอร์</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">ชำระเงิน</Text>
        {order && <Text className="text-gray-500 mt-1">ออเดอร์ #{order.id.slice(0, 8).toUpperCase()} — {fmt(Number(order.total))}</Text>}
      </View>

      <View className="px-4 pb-3">
        <View className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
          <Text className="text-sm font-semibold text-violet-800 mb-1">🧪 โหมดทดสอบ (Demo)</Text>
          <Text className="text-xs text-violet-600 mb-3">กดปุ่มด้านล่างเพื่อจำลองการชำระเงินสำเร็จ โดยไม่ต้องใช้บัตรหรือโอนเงินจริง</Text>
          <TouchableOpacity onPress={submitDemo} disabled={demoLoading} className="bg-violet-600 rounded-xl py-3 items-center">
            <Text className="text-white font-bold text-sm">{demoLoading ? "กำลังดำเนินการ..." : `จำลองชำระเงิน ${order ? fmt(Number(order.total)) : ""}`}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row gap-2 px-4 mb-4">
        {([
          { id: "promptpay", label: "📱 PromptPay" },
          { id: "bank_transfer", label: "🏦 โอนธนาคาร" },
          { id: "credit_card", label: "💳 บัตรเครดิต" },
        ] as const).map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            onPress={() => setMethod(id)}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${method === id ? "border-primary-600 bg-primary-50" : "border-gray-200"}`}
          >
            <Text className={`text-xs font-medium ${method === id ? "text-primary-700" : "text-gray-500"}`}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="px-4">
        {method === "promptpay" && (
          <View className="bg-white rounded-2xl p-6 items-center">
            {loading ? <ActivityIndicator color="#16a34a" /> : qrData?.qrImage ? (
              <Image source={{ uri: qrData.qrImage }} style={{ width: 220, height: 220 }} resizeMode="contain" />
            ) : qrData?.promptpayId ? (
              <View className="items-center">
                <Text className="font-semibold text-gray-800 mb-2">โอน PromptPay มายัง</Text>
                <Text className="text-2xl font-bold text-primary-600">{qrData.promptpayId}</Text>
              </View>
            ) : null}
            <Text className="text-xs text-gray-400 mt-4 text-center">สแกน QR หรือโอนตามเบอร์ พร้อมเพย์ ระบบจะตรวจสอบอัตโนมัติ</Text>
          </View>
        )}

        {method === "bank_transfer" && (
          <View className="bg-white rounded-2xl p-5">
            <Text className="font-semibold text-gray-800 mb-3">แนบสลิปโอนเงิน</Text>
            <TouchableOpacity onPress={pickSlip} className="border-2 border-dashed border-gray-300 rounded-xl h-40 items-center justify-center overflow-hidden">
              {slipUri
                ? <Image source={{ uri: slipUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                : <Text className="text-gray-400">แตะเพื่อเลือกรูปสลิป</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submitSlip}
              disabled={!slipUri || loading || verifying}
              className={`rounded-xl py-3.5 items-center mt-4 ${slipUri && !verifying ? "bg-primary-600" : "bg-gray-200"}`}
            >
              <Text className={`font-bold ${slipUri && !verifying ? "text-white" : "text-gray-400"}`}>
                {verifying ? "กำลังตรวจสอบสลิป..." : "ส่งสลิปยืนยันการโอน"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {method === "credit_card" && (
          <View className="bg-white rounded-2xl p-5">
            {gatewayInfo?.configured ? (
              <>
                <Text className="text-sm text-gray-600 mb-3">การชำระด้วยบัตรเครดิตรองรับผ่านเว็บเบราว์เซอร์เท่านั้น (ระบบยืนยันตัวตน 3D Secure ต้องใช้หน้าเว็บของธนาคาร)</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`${WEB_APP_URL}/checkout/${orderId}`)}
                  className="bg-primary-600 rounded-xl py-3.5 items-center"
                >
                  <Text className="text-white font-bold">เปิดหน้าชำระเงินด้วยบัตร</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text className="text-gray-400 text-sm text-center py-6">ยังไม่รองรับการชำระด้วยบัตรในขณะนี้</Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
