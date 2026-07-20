import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useMemo, useState } from "react"
import { api } from "../../../lib/api"

interface Product {
  id: string; name: string; price: string; stock: number
  category: string; status: "active" | "inactive" | "out_of_stock"
  shop: { id: string; name: string }
}

const STATUS_LABELS: Record<Product["status"], { label: string; color: string }> = {
  active: { label: "แสดง", color: "text-green-700 bg-green-100" },
  inactive: { label: "ซ่อน", color: "text-gray-500 bg-gray-100" },
  out_of_stock: { label: "สินค้าหมด", color: "text-red-600 bg-red-100" },
}

function fmt(n: number) { return `฿${n.toLocaleString()}` }

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  function load() {
    setLoading(true)
    api.get("/admin/products").then(r => setProducts(r.data.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q) || p.shop.name.toLowerCase().includes(q))
  }, [products, search])

  async function toggleVisibility(p: Product) {
    const newStatus = p.status === "active" ? "inactive" : "active"
    try {
      await api.patch(`/admin/products/${p.id}`, { status: newStatus })
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x))
    } catch { Alert.alert("ข้อผิดพลาด") }
  }

  function confirmDelete(id: string) {
    Alert.alert("ลบสินค้า", "ต้องการลบสินค้านี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: async () => { await api.delete(`/admin/products/${id}`); setProducts(prev => prev.filter(p => p.id !== id)) } },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900 mb-3">จัดการสินค้า (ทุกร้าน)</Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
          placeholder="ค้นหาสินค้า หรือชื่อร้าน..."
          value={search} onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-2 pb-6"
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => {
          const s = STATUS_LABELS[item.status]
          return (
            <View className="bg-white rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>{item.name}</Text>
                <View className={`px-2 py-1 rounded-full ${s.color.split(" ")[1]}`}>
                  <Text className={`text-xs font-medium ${s.color.split(" ")[0]}`}>{s.label}</Text>
                </View>
              </View>
              <Text className="text-xs text-gray-400">ร้าน {item.shop.name} · คงเหลือ {item.stock}</Text>
              <Text className="text-primary-600 font-bold mt-1">{fmt(Number(item.price))}</Text>
              <View className="flex-row gap-4 mt-2 pt-2 border-t border-gray-50">
                <TouchableOpacity onPress={() => toggleVisibility(item)}>
                  <Text className="text-xs text-gray-500">{item.status === "active" ? "ซ่อนสินค้า" : "แสดงสินค้า"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item.id)} className="ml-auto">
                  <Text className="text-xs text-red-400">ลบ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={() => <Text className="text-gray-400 text-center py-10">{loading ? "กำลังโหลด..." : "ไม่พบสินค้า"}</Text>}
      />
    </SafeAreaView>
  )
}
