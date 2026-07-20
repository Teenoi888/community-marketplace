import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Coupon {
  id: string; code: string; discountType: "percent" | "fixed"; discountValue: string
  usageLimit: number | null; usedCount: number; active: boolean
}

function fmt(n: number) { return `฿${n.toLocaleString()}` }

export default function CouponsScreen() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent")
  const [discountValue, setDiscountValue] = useState("")

  async function loadCoupons(id: string) {
    setLoading(true)
    try { const r = await api.get(`/coupons/mine?shopId=${id}`); setCoupons(r.data.data || []) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    api.get("/auth/me/shop").then(r => { setShopId(r.data.data.id); loadCoupons(r.data.data.id) }).catch(() => setLoading(false))
  }, [])

  async function submit() {
    if (!shopId) return
    if (!code.trim()) return Alert.alert("กรอกโค้ดส่วนลด")
    const val = Number(discountValue)
    if (!val || val <= 0) return Alert.alert("กรอกมูลค่าส่วนลดให้ถูกต้อง")

    setSubmitting(true)
    try {
      await api.post("/coupons", { shopId, code, discountType, discountValue: val })
      setCode(""); setDiscountValue("")
      loadCoupons(shopId)
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "สร้างคูปองไม่สำเร็จ")
    } finally { setSubmitting(false) }
  }

  async function toggleActive(coupon: Coupon) {
    await api.patch(`/coupons/${coupon.id}`, { active: !coupon.active })
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c))
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">คูปองส่วนลด</Text>
      </View>

      {loading ? <ActivityIndicator color="#16a34a" className="mt-10" /> : !shopId ? (
        <Text className="text-center text-gray-400 mt-10">ยังไม่มีร้านค้า</Text>
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
          <View className="bg-white rounded-2xl p-4 gap-3">
            <Text className="font-semibold text-gray-800">สร้างคูปองใหม่</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5 tracking-widest" placeholder="SAVE50" autoCapitalize="characters" value={code} onChangeText={t => setCode(t.toUpperCase())} />
            <View className="flex-row gap-2">
              {(["percent", "fixed"] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setDiscountType(t)} className={`flex-1 py-2.5 rounded-xl border items-center ${discountType === t ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}>
                  <Text className={`text-xs font-medium ${discountType === t ? "text-white" : "text-gray-600"}`}>{t === "percent" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงิน (บาท)"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder={discountType === "percent" ? "10" : "50"} keyboardType="decimal-pad" value={discountValue} onChangeText={setDiscountValue} />
            <TouchableOpacity onPress={submit} disabled={submitting} className="bg-primary-600 rounded-xl py-3 items-center">
              <Text className="text-white font-bold">{submitting ? "กำลังสร้าง..." : "สร้างคูปอง"}</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="font-semibold text-gray-800 mb-2">คูปองของร้าน</Text>
            {coupons.length === 0 ? (
              <Text className="text-sm text-gray-400 text-center py-4">ยังไม่มีคูปอง</Text>
            ) : coupons.map((c, i) => (
              <View key={c.id} className={`flex-row justify-between items-center py-2 ${i < coupons.length - 1 ? "border-b border-gray-50" : ""}`}>
                <View>
                  <Text className="font-mono font-semibold text-gray-900">{c.code}</Text>
                  <Text className="text-xs text-gray-400">
                    {c.discountType === "percent" ? `ลด ${c.discountValue}%` : `ลด ${fmt(Number(c.discountValue))}`} · ใช้แล้ว {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => toggleActive(c)} className={`px-2.5 py-1 rounded-full ${c.active ? "bg-green-50" : "bg-gray-100"}`}>
                  <Text className={`text-xs font-medium ${c.active ? "text-green-600" : "text-gray-400"}`}>{c.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
