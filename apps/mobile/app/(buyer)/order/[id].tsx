import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

const STATUS_STEPS = [
  { key: "pending_payment", label: "รอชำระเงิน" },
  { key: "paid", label: "ชำระแล้ว" },
  { key: "preparing", label: "เตรียมสินค้า" },
  { key: "shipped", label: "จัดส่งแล้ว" },
  { key: "delivered", label: "ส่งถึงแล้ว" },
]

function fmt(n: number) { return `฿${n.toLocaleString()}` }

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  function load() {
    api.get(`/orders/${id}`).then(r => setOrder(r.data.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  async function confirmReceived() {
    Alert.alert("ยืนยันรับสินค้า", "คุณได้รับสินค้าเรียบร้อยแล้วใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ยืนยัน", onPress: async () => {
          setBusy(true)
          try { await api.patch(`/orders/${id}/status`, { status: "delivered" }); load() }
          finally { setBusy(false) }
        },
      },
    ])
  }

  async function cancelOrder() {
    Alert.alert("ยกเลิกออเดอร์", "ต้องการยกเลิกออเดอร์นี้ใช่ไหม?", [
      { text: "ไม่", style: "cancel" },
      {
        text: "ยกเลิกออเดอร์", style: "destructive", onPress: async () => {
          setBusy(true)
          try { await api.patch(`/orders/${id}/status`, { status: "cancelled" }); load() }
          finally { setBusy(false) }
        },
      },
    ])
  }

  if (loading || !order) {
    return <SafeAreaView className="flex-1 bg-white items-center justify-center"><Text className="text-gray-400">กำลังโหลด...</Text></SafeAreaView>
  }

  const stepIndex = STATUS_STEPS.findIndex(s => s.key === order.status)
  const isCancelled = order.status === "cancelled"

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">ออเดอร์ #{order.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
        {/* Status timeline */}
        {!isCancelled ? (
          <View className="bg-white rounded-2xl p-4">
            <View className="flex-row justify-between">
              {STATUS_STEPS.map((s, i) => (
                <View key={s.key} className="items-center flex-1">
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${i <= stepIndex ? "bg-primary-600" : "bg-gray-200"}`}>
                    {i <= stepIndex && <Text className="text-white text-xs">✓</Text>}
                  </View>
                  <Text className={`text-[10px] mt-1 text-center ${i <= stepIndex ? "text-primary-700 font-medium" : "text-gray-400"}`}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-4 items-center">
            <Text className="text-red-600 font-semibold">ออเดอร์นี้ถูกยกเลิกแล้ว</Text>
          </View>
        )}

        {/* Tracking */}
        {order.trackingNumber && (
          <View className="bg-white rounded-2xl p-4">
            <Text className="font-semibold text-gray-800 mb-2">ข้อมูลจัดส่ง</Text>
            <Text className="text-sm text-gray-600">{order.logisticsProvider}</Text>
            <Text className="text-sm text-gray-900 font-medium mt-0.5">{order.trackingNumber}</Text>
          </View>
        )}

        {/* Items */}
        <View className="bg-white rounded-2xl p-4">
          <Text className="font-semibold text-gray-800 mb-2">รายการสินค้า</Text>
          {(order.items || []).map((oi: any) => (
            <View key={oi.id} className="flex-row justify-between py-1.5">
              <Text className="text-sm text-gray-700 flex-1 mr-2" numberOfLines={1}>{oi.productName} ×{oi.qty}</Text>
              <Text className="text-sm text-gray-500">{fmt(Number(oi.priceSnapshot) * oi.qty)}</Text>
            </View>
          ))}
          <View className="border-t border-gray-100 mt-2 pt-2 flex-row justify-between">
            <Text className="text-gray-500 text-sm">รวม</Text>
            <Text className="font-bold text-primary-600">{fmt(Number(order.total))}</Text>
          </View>
        </View>

        {/* Delivery address */}
        <View className="bg-white rounded-2xl p-4">
          <Text className="font-semibold text-gray-800 mb-2">ที่อยู่จัดส่ง</Text>
          <Text className="text-sm text-gray-700">{order.deliveryAddress?.name} · {order.deliveryAddress?.phone}</Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            {order.deliveryAddress?.address}, {order.deliveryAddress?.subdistrict}, {order.deliveryAddress?.district}, {order.deliveryAddress?.province} {order.deliveryAddress?.zipCode}
          </Text>
        </View>

        {/* Actions */}
        {order.status === "pending_payment" && (
          <TouchableOpacity onPress={() => router.push(`/(buyer)/checkout/${order.id}`)} className="bg-primary-600 rounded-xl py-3.5 items-center">
            <Text className="text-white font-bold">ไปชำระเงิน</Text>
          </TouchableOpacity>
        )}
        {order.status === "shipped" && (
          <TouchableOpacity onPress={confirmReceived} disabled={busy} className="bg-primary-600 rounded-xl py-3.5 items-center">
            <Text className="text-white font-bold">{busy ? "กำลังยืนยัน..." : "ยืนยันรับสินค้าแล้ว"}</Text>
          </TouchableOpacity>
        )}
        {(order.status === "pending_payment" || order.status === "paid") && (
          <TouchableOpacity onPress={cancelOrder} disabled={busy} className="border border-red-200 rounded-xl py-3.5 items-center">
            <Text className="text-red-500 font-semibold">ยกเลิกออเดอร์</Text>
          </TouchableOpacity>
        )}
        {order.status === "delivered" && (
          <TouchableOpacity onPress={() => router.push(`/(buyer)/product/${order.items?.[0]?.productId}`)} className="border border-primary-200 rounded-xl py-3.5 items-center">
            <Text className="text-primary-600 font-semibold">ให้คะแนนสินค้า</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
