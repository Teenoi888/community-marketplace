import { View, Text, TouchableOpacity, FlatList, TextInput, RefreshControl, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../../lib/api"

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "รอชำระ", color: "text-yellow-600 bg-yellow-50" },
  paid: { label: "ชำระแล้ว", color: "text-blue-600 bg-blue-50" },
  preparing: { label: "เตรียมสินค้า", color: "text-indigo-600 bg-indigo-50" },
  shipped: { label: "จัดส่งแล้ว", color: "text-primary-600 bg-primary-50" },
  delivered: { label: "ส่งถึงแล้ว", color: "text-green-600 bg-green-50" },
  cancelled: { label: "ยกเลิก", color: "text-red-600 bg-red-50" },
}

const LOGISTICS = ["ไปรษณีย์ไทย", "Kerry Express", "Flash Express", "J&T Express", "DHL", "ส่งผ่านชุมชน (LINE)", "อื่นๆ"]
const LINE_COMMUNITY = "ส่งผ่านชุมชน (LINE)"

function fmt(n: number) { return `฿${n.toLocaleString()}` }

export default function SellerOrdersScreen() {
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["seller-orders"],
    queryFn: async () => { const { data } = await api.get("/orders/shop"); return data.data || [] },
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tracking, setTracking] = useState<Record<string, { number: string; provider: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  async function updateStatus(orderId: string, status: string) {
    try { await api.patch(`/orders/${orderId}/status`, { status }); refetch() }
    catch { Alert.alert("ข้อผิดพลาด", "อัปเดตสถานะไม่สำเร็จ") }
  }

  async function saveTracking(orderId: string) {
    const t = tracking[orderId]
    const isLine = t?.provider === LINE_COMMUNITY
    if (!isLine && (!t?.number || !t?.provider)) return Alert.alert("กรุณากรอกข้อมูลให้ครบ")
    setSaving(orderId)
    try {
      await api.patch(`/orders/${orderId}/tracking`, {
        trackingNumber: isLine ? `LINE-${Date.now()}` : t.number,
        logisticsProvider: t.provider || LOGISTICS[0],
      })
      refetch()
    } catch { Alert.alert("ข้อผิดพลาด") } finally { setSaving(null) }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">ออเดอร์ร้านฉัน</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-3 pb-6"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#16a34a"]} />}
        renderItem={({ item: order }) => {
          const s = STATUS_MAP[order.status] || STATUS_MAP.pending_payment
          const isOpen = expanded === order.id
          const t = tracking[order.id] || { number: order.trackingNumber || "", provider: order.logisticsProvider || LOGISTICS[0] }

          return (
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <TouchableOpacity onPress={() => setExpanded(isOpen ? null : order.id)} className="p-4 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</Text>
                  <Text className="font-bold text-gray-900 mt-0.5">{fmt(Number(order.total))}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${s.color.split(" ")[1]}`}>
                  <Text className={`text-xs font-semibold ${s.color.split(" ")[0]}`}>{s.label}</Text>
                </View>
              </TouchableOpacity>

              {isOpen && (
                <View className="px-4 pb-4 border-t border-gray-50 pt-3 gap-3">
                  {(order.items || []).map((oi: any) => (
                    <View key={oi.id} className="flex-row justify-between">
                      <Text className="text-sm text-gray-600 flex-1 mr-2" numberOfLines={1}>{oi.productName} ×{oi.qty}</Text>
                    </View>
                  ))}

                  {order.status === "paid" && (
                    <TouchableOpacity onPress={() => updateStatus(order.id, "preparing")} className="bg-indigo-600 rounded-xl py-2.5 items-center">
                      <Text className="text-white font-semibold text-sm">เริ่มเตรียมสินค้า</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === "preparing" && (
                    <View className="gap-2">
                      <Text className="text-sm font-medium text-gray-700">เลือกขนส่ง</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {LOGISTICS.map(l => (
                          <TouchableOpacity
                            key={l}
                            onPress={() => setTracking(prev => ({ ...prev, [order.id]: { ...t, provider: l } }))}
                            className={`px-3 py-1.5 rounded-full border ${t.provider === l ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}
                          >
                            <Text className={`text-xs ${t.provider === l ? "text-white" : "text-gray-600"}`}>{l}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {t.provider !== LINE_COMMUNITY && (
                        <TextInput
                          placeholder="เลขพัสดุ"
                          value={t.number}
                          onChangeText={(v) => setTracking(prev => ({ ...prev, [order.id]: { ...t, number: v } }))}
                          className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        />
                      )}
                      <TouchableOpacity onPress={() => saveTracking(order.id)} disabled={saving === order.id} className="bg-primary-600 rounded-xl py-2.5 items-center">
                        <Text className="text-white font-semibold text-sm">{saving === order.id ? "กำลังบันทึก..." : "บันทึก & จัดส่ง"}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        }}
        ListEmptyComponent={() => (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">📦</Text>
            <Text className="text-gray-400">{isLoading ? "กำลังโหลด..." : "ยังไม่มีออเดอร์"}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
