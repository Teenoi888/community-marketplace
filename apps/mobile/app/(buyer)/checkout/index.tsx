import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { api } from "../../../lib/api"
import { useCartStore } from "../../../lib/store/cart"

interface SavedAddress {
  id: string; label: string; name: string; phone: string; address: string
  province: string; district: string; subdistrict: string; zipCode: string; isDefault: boolean
}

function fmt(n: number) { return `฿${n.toLocaleString()}` }

export default function CheckoutScreen() {
  const { selectedItems, selectedTotal, removeItems } = useCartStore()
  const items = selectedItems()
  const total = selectedTotal()

  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const byShop = useMemo(() => items.reduce((acc, item) => {
    if (!acc[item.shopId]) acc[item.shopId] = []
    acc[item.shopId].push(item)
    return acc
  }, {} as Record<string, typeof items>), [items])
  const singleShopId = Object.keys(byShop).length === 1 ? Object.keys(byShop)[0] : null

  const [couponInput, setCouponInput] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  useEffect(() => {
    api.get("/addresses").then(r => {
      const list: SavedAddress[] = r.data.data || []
      setAddresses(list)
      const def = list.find(a => a.isDefault) ?? list[0]
      if (def) setSelectedId(def.id)
    }).finally(() => setLoadingAddresses(false))
  }, [])

  async function applyCoupon() {
    if (!singleShopId || !couponInput.trim()) return
    setApplyingCoupon(true)
    try {
      const r = await api.post("/coupons/validate", { code: couponInput.trim(), shopId: singleShopId, subtotal: total })
      setAppliedCoupon({ code: r.data.data.code, discount: r.data.data.discount })
    } catch (err: any) {
      setAppliedCoupon(null)
      Alert.alert("คูปองไม่ถูกต้อง", err.response?.data?.error || "ลองใหม่อีกครั้ง")
    } finally {
      setApplyingCoupon(false)
    }
  }

  async function placeOrder() {
    if (items.length === 0) return
    const addr = addresses.find(a => a.id === selectedId)
    if (!addr) return Alert.alert("กรุณาเลือกที่อยู่จัดส่ง", "หรือเพิ่มที่อยู่ใหม่ก่อน", [
      { text: "ตกลง" }, { text: "เพิ่มที่อยู่", onPress: () => router.push("/(buyer)/addresses") },
    ])

    setSubmitting(true)
    try {
      const orders = await Promise.all(
        Object.entries(byShop).map(([shopId, shopItems]) =>
          api.post("/orders", {
            shopId,
            items: shopItems.map(i => ({ productId: i.product.id, quantity: i.quantity })),
            deliveryAddress: { label: addr.label, name: addr.name, phone: addr.phone, address: addr.address, province: addr.province, district: addr.district, subdistrict: addr.subdistrict, zipCode: addr.zipCode },
            couponCode: shopId === singleShopId ? appliedCoupon?.code : undefined,
          }).then(r => r.data.data)
        )
      )
      removeItems(items.map(i => i.product.id))
      router.replace(`/(buyer)/checkout/${orders[0].id}`)
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-gray-400 mb-4">ไม่มีสินค้าที่เลือกไว้</Text>
        <TouchableOpacity onPress={() => router.replace("/(buyer)/cart")}><Text className="text-primary-600 font-medium">กลับไปตะกร้า</Text></TouchableOpacity>
      </SafeAreaView>
    )
  }

  const finalTotal = Math.max(0, total - (appliedCoupon?.discount ?? 0))

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">ที่อยู่จัดส่ง</Text>
      </View>

      <FlatList
        data={loadingAddresses ? [] : addresses}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-3 pb-4"
        ListHeaderComponent={loadingAddresses ? () => <ActivityIndicator color="#16a34a" className="my-4" /> : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedId(item.id)}
            className={`bg-white rounded-2xl p-4 border-2 ${selectedId === item.id ? "border-primary-500" : "border-gray-100"}`}
          >
            <Text className="font-semibold text-gray-800 mb-1">{item.label}{item.isDefault ? " · หลัก" : ""}</Text>
            <Text className="text-sm font-medium text-gray-900">{item.name} · {item.phone}</Text>
            <Text className="text-sm text-gray-500 mt-0.5">{item.address}, {item.subdistrict}, {item.district}, {item.province} {item.zipCode}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={() => (
          <TouchableOpacity
            onPress={() => router.push("/(buyer)/addresses")}
            className="border-2 border-dashed border-gray-300 rounded-2xl py-4 items-center mt-1"
          >
            <Text className="text-gray-500 font-medium">+ เพิ่ม/จัดการที่อยู่</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={loadingAddresses ? null : () => (
          <TouchableOpacity
            onPress={() => router.push("/(buyer)/addresses")}
            className="bg-primary-50 border-2 border-primary-200 rounded-2xl py-6 items-center"
          >
            <Text className="text-primary-700 font-semibold">ยังไม่มีที่อยู่ — เพิ่มเลย</Text>
          </TouchableOpacity>
        )}
      />

      <View className="bg-white border-t border-gray-100 px-4 pt-4 pb-2">
        <Text className="font-bold text-gray-900 mb-2">รายการสั่งซื้อ</Text>
        {items.map(({ product, quantity }) => (
          <View key={product.id} className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-600 flex-1 mr-2" numberOfLines={1}>{product.name} ×{quantity}</Text>
            <Text className="text-sm font-medium text-gray-900">{fmt(product.price * quantity)}</Text>
          </View>
        ))}

        {singleShopId && (
          <View className="mt-2">
            {appliedCoupon ? (
              <View className="flex-row items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                <Text className="text-sm text-green-700">🏷️ {appliedCoupon.code}</Text>
                <TouchableOpacity onPress={() => { setAppliedCoupon(null); setCouponInput("") }}>
                  <Text className="text-xs text-green-700 underline">ยกเลิก</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <TextInput
                  value={couponInput} onChangeText={t => setCouponInput(t.toUpperCase())}
                  placeholder="โค้ดส่วนลด" autoCapitalize="characters"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
                <TouchableOpacity onPress={applyCoupon} disabled={applyingCoupon || !couponInput.trim()} className="px-4 justify-center rounded-xl border border-gray-300">
                  <Text className="text-sm font-medium text-gray-600">{applyingCoupon ? "..." : "ใช้"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {appliedCoupon && (
          <View className="flex-row justify-between mt-2">
            <Text className="text-sm text-gray-500">ส่วนลด</Text>
            <Text className="text-sm text-green-600">-{fmt(appliedCoupon.discount)}</Text>
          </View>
        )}
        <View className="flex-row justify-between border-t border-gray-100 mt-2 pt-2">
          <Text className="font-bold text-gray-900">รวม</Text>
          <Text className="font-bold text-primary-600">{fmt(finalTotal)}</Text>
        </View>
      </View>

      <View className="px-4 py-3 bg-white">
        <TouchableOpacity
          onPress={placeOrder}
          disabled={submitting || loadingAddresses}
          className={`bg-primary-600 rounded-xl py-4 items-center ${submitting || loadingAddresses ? "opacity-60" : ""}`}
        >
          <Text className="text-white font-bold text-base">{submitting ? "กำลังสร้างออเดอร์..." : `สั่งซื้อ (${fmt(finalTotal)})`}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
