import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Product { id: string; name: string; stock: number; price: string }
interface StockLog { id: string; delta: number; reason: string; note: string | null; createdAt: string; user: { name: string } | null }

const REASONS = [
  { value: "restock", label: "เติมสต็อก" },
  { value: "damage", label: "สินค้าเสียหาย" },
  { value: "return", label: "ลูกค้าคืนสินค้า" },
  { value: "correction", label: "แก้ไขตัวเลข" },
  { value: "manual", label: "อื่นๆ" },
]

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState("restock")
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<StockLog[] | null>(null)

  function fetchProducts() {
    setLoading(true)
    api.get("/stock").then(r => setProducts(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { fetchProducts() }, [])

  async function adjustStock(productId: string) {
    const d = Number(delta)
    if (!d) return Alert.alert("กรุณากรอกจำนวนที่ต้องการปรับ")
    setSaving(true)
    try {
      await api.patch(`/stock/${productId}`, { delta: d, reason })
      setAdjusting(null); setDelta("")
      fetchProducts()
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally { setSaving(false) }
  }

  async function viewLogs(productId: string) {
    const r = await api.get(`/stock/${productId}/logs`)
    setLogs(r.data.data || [])
  }

  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5)
  const outOfStock = products.filter(p => p.stock === 0)

  if (logs !== null) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center gap-3 px-4 py-4">
          <TouchableOpacity onPress={() => setLogs(null)}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">ประวัติการปรับสต็อก</Text>
        </View>
        <FlatList
          data={logs}
          keyExtractor={(l) => l.id}
          contentContainerClassName="px-4 gap-2 pb-6"
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-3 flex-row justify-between items-center">
              <View>
                <Text className={`font-bold ${item.delta > 0 ? "text-green-600" : "text-red-500"}`}>{item.delta > 0 ? "+" : ""}{item.delta}</Text>
                <Text className="text-xs text-gray-400">{REASONS.find(r => r.value === item.reason)?.label || item.reason} · {item.user?.name || "ระบบ"}</Text>
              </View>
              <Text className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString("th-TH")}</Text>
            </View>
          )}
          ListEmptyComponent={() => <Text className="text-gray-400 text-center py-10">ยังไม่มีประวัติ</Text>}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">จัดการสต็อก</Text>
      </View>

      {loading ? <ActivityIndicator color="#16a34a" className="mt-10" /> : (
        <ScrollView contentContainerClassName="px-4 pb-8 gap-3">
          {(outOfStock.length > 0 || lowStock.length > 0) && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <Text className="text-sm text-amber-700">
                {outOfStock.length > 0 && `${outOfStock.length} รายการหมดสต็อก`}
                {outOfStock.length > 0 && lowStock.length > 0 && " · "}
                {lowStock.length > 0 && `${lowStock.length} รายการใกล้หมด`}
              </Text>
            </View>
          )}

          {products.map(p => (
            <View key={p.id} className="bg-white rounded-2xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="font-semibold text-gray-900" numberOfLines={1}>{p.name}</Text>
                  <Text className={`text-sm mt-0.5 ${p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-amber-500" : "text-gray-500"}`}>
                    คงเหลือ {p.stock} ชิ้น
                  </Text>
                </View>
                <TouchableOpacity onPress={() => viewLogs(p.id)} className="px-3 py-1.5 rounded-lg border border-gray-200 mr-2">
                  <Text className="text-xs text-gray-600">ประวัติ</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAdjusting(adjusting === p.id ? null : p.id)} className="px-3 py-1.5 rounded-lg bg-primary-600">
                  <Text className="text-xs text-white font-medium">ปรับสต็อก</Text>
                </TouchableOpacity>
              </View>

              {adjusting === p.id && (
                <View className="mt-3 pt-3 border-t border-gray-100 gap-3">
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => setDelta(String(Math.abs(Number(delta) || 1)))} className="w-10 h-10 rounded-lg bg-green-50 items-center justify-center">
                      <Text className="text-green-600 font-bold">+</Text>
                    </TouchableOpacity>
                    <TextInput
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-center"
                      keyboardType="numbers-and-punctuation"
                      placeholder="เช่น 10 หรือ -5"
                      value={delta}
                      onChangeText={setDelta}
                    />
                    <TouchableOpacity onPress={() => setDelta(String(-Math.abs(Number(delta) || 1)))} className="w-10 h-10 rounded-lg bg-red-50 items-center justify-center">
                      <Text className="text-red-500 font-bold">-</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {REASONS.map(r => (
                      <TouchableOpacity
                        key={r.value} onPress={() => setReason(r.value)}
                        className={`px-3 py-1.5 rounded-full border ${reason === r.value ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}
                      >
                        <Text className={`text-xs ${reason === r.value ? "text-white" : "text-gray-600"}`}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => adjustStock(p.id)} disabled={saving} className="bg-primary-600 rounded-xl py-2.5 items-center">
                    <Text className="text-white font-semibold text-sm">{saving ? "กำลังบันทึก..." : "ยืนยันการปรับสต็อก"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
