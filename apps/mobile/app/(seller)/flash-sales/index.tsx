import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface FlashSale {
  id: string; discountPct: number; startsAt: string; endsAt: string; isActive: boolean
  product: { name: string; price: string }
}
interface Product { id: string; name: string; price: string; stock: number }

const DURATIONS = [
  { label: "1 ชม.", hours: 1 },
  { label: "2 ชม.", hours: 2 },
  { label: "6 ชม.", hours: 6 },
  { label: "24 ชม.", hours: 24 },
]

function fmt(d: string) {
  return new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function saleStatus(sale: FlashSale) {
  const now = Date.now()
  const start = new Date(sale.startsAt).getTime()
  const end = new Date(sale.endsAt).getTime()
  if (!sale.isActive) return { label: "ยกเลิกแล้ว", color: "text-gray-500 bg-gray-100" }
  if (now < start) return { label: "รอเริ่ม", color: "text-blue-600 bg-blue-100" }
  if (now <= end) return { label: "กำลัง Active", color: "text-green-700 bg-green-100" }
  return { label: "หมดเวลา", color: "text-gray-400 bg-gray-100" }
}

export default function FlashSalesScreen() {
  const [sales, setSales] = useState<FlashSale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [productId, setProductId] = useState("")
  const [discountPct, setDiscountPct] = useState("10")
  const [durationHours, setDurationHours] = useState(2)
  const [saving, setSaving] = useState(false)

  async function fetchSales() {
    try {
      const [sr, pr] = await Promise.all([api.get("/flash-sales/shop"), api.get("/stock")])
      setSales(sr.data.data || [])
      setProducts((pr.data.data || []).filter((p: Product) => p.stock > 0))
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchSales() }, [])

  function openForm() {
    setProductId(products[0]?.id || "")
    setShowForm(true)
  }

  async function createSale() {
    if (!productId) return Alert.alert("กรุณาเลือกสินค้า")
    const pct = Number(discountPct)
    if (!pct || pct <= 0 || pct >= 100) return Alert.alert("กรอกเปอร์เซ็นต์ส่วนลดให้ถูกต้อง (1-99)")

    const startsAt = new Date(Date.now() + 5 * 60 * 1000)
    const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000)

    setSaving(true)
    try {
      await api.post("/flash-sales", { productId, discountPct: pct, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })
      setShowForm(false)
      fetchSales()
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally { setSaving(false) }
  }

  async function deleteSale(id: string) {
    await api.delete(`/flash-sales/${id}`)
    setSales(s => s.map(x => x.id === id ? { ...x, isActive: false } : x))
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">⚡ Flash Sale</Text>
        </View>
        <TouchableOpacity onPress={openForm}><Text className="text-primary-600 font-semibold">+ สร้างใหม่</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#16a34a" className="mt-10" /> : (
        <ScrollView contentContainerClassName="px-4 pb-8 gap-3">
          {showForm && (
            <View className="bg-white rounded-2xl border-2 border-primary-200 p-4 gap-3">
              <Text className="font-semibold text-gray-800">เลือกสินค้า</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {products.map(p => (
                  <TouchableOpacity
                    key={p.id} onPress={() => setProductId(p.id)}
                    className={`px-3 py-2 rounded-xl border ${productId === p.id ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}
                  >
                    <Text className={`text-xs font-medium ${productId === p.id ? "text-white" : "text-gray-700"}`} numberOfLines={1}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="font-semibold text-gray-800 mt-1">ส่วนลด (%)</Text>
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" keyboardType="number-pad" value={discountPct} onChangeText={setDiscountPct} />

              <Text className="font-semibold text-gray-800 mt-1">ระยะเวลา (เริ่มใน 5 นาที)</Text>
              <View className="flex-row gap-2">
                {DURATIONS.map(d => (
                  <TouchableOpacity
                    key={d.hours} onPress={() => setDurationHours(d.hours)}
                    className={`flex-1 py-2 rounded-xl border items-center ${durationHours === d.hours ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}
                  >
                    <Text className={`text-xs font-medium ${durationHours === d.hours ? "text-white" : "text-gray-600"}`}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={createSale} disabled={saving} className="bg-primary-600 rounded-xl py-3 items-center mt-1">
                <Text className="text-white font-bold">{saving ? "กำลังสร้าง..." : "สร้าง Flash Sale"}</Text>
              </TouchableOpacity>
            </View>
          )}

          {sales.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">⚡</Text>
              <Text className="text-gray-400">ยังไม่มี Flash Sale</Text>
            </View>
          ) : sales.map(sale => {
            const status = saleStatus(sale)
            return (
              <View key={sale.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>{sale.product.name}</Text>
                  <View className={`px-2 py-1 rounded-full ${status.color.split(" ")[1]}`}>
                    <Text className={`text-xs font-medium ${status.color.split(" ")[0]}`}>{status.label}</Text>
                  </View>
                </View>
                <Text className="text-red-500 font-bold">ลด {sale.discountPct}%</Text>
                <Text className="text-xs text-gray-400 mt-1">{fmt(sale.startsAt)} — {fmt(sale.endsAt)}</Text>
                {sale.isActive && (
                  <TouchableOpacity onPress={() => deleteSale(sale.id)} className="mt-2">
                    <Text className="text-xs text-red-400">ยกเลิก Flash Sale นี้</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
