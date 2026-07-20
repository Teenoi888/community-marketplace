import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Analytics {
  summary: { total_orders: number; total_revenue: number; avg_order_value: number }
  dailyRevenue: { day: string; order_count: number; revenue: number }[]
  topProducts: { product_name: string; total_qty: number; total_revenue: number }[]
}

function fmt(n: number) { return `฿${Math.round(n).toLocaleString()}` }

export default function AnalyticsScreen() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    setLoading(true)
    api.get(`/orders/shop/analytics?period=${period}`).then(r => setData(r.data.data)).finally(() => setLoading(false))
  }, [period])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">สถิติร้านค้า</Text>
      </View>

      <View className="flex-row gap-2 px-4 mb-3">
        {[7, 30, 90].map(p => (
          <TouchableOpacity key={p} onPress={() => setPeriod(p)} className={`px-4 py-2 rounded-full border ${period === p ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}>
            <Text className={`text-xs font-medium ${period === p ? "text-white" : "text-gray-600"}`}>{p} วัน</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading || !data ? (
        <ActivityIndicator color="#16a34a" className="mt-10" />
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl p-4">
              <Text className="text-xs text-gray-500">ยอดขายรวม</Text>
              <Text className="text-lg font-bold text-primary-600 mt-1">{fmt(data.summary.total_revenue)}</Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl p-4">
              <Text className="text-xs text-gray-500">จำนวนออเดอร์</Text>
              <Text className="text-lg font-bold text-gray-900 mt-1">{data.summary.total_orders}</Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl p-4">
              <Text className="text-xs text-gray-500">เฉลี่ย/ออเดอร์</Text>
              <Text className="text-lg font-bold text-gray-900 mt-1">{fmt(data.summary.avg_order_value)}</Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="font-semibold text-gray-800 mb-3">ยอดขายรายวัน</Text>
            {data.dailyRevenue.length === 0 ? (
              <Text className="text-gray-400 text-sm">ยังไม่มีข้อมูล</Text>
            ) : data.dailyRevenue.map((d, i) => (
              <View key={d.day} className={`flex-row justify-between py-1.5 ${i < data.dailyRevenue.length - 1 ? "border-b border-gray-50" : ""}`}>
                <Text className="text-sm text-gray-600">{new Date(d.day).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</Text>
                <Text className="text-sm text-gray-500">{d.order_count} ออเดอร์</Text>
                <Text className="text-sm font-medium text-gray-900">{fmt(d.revenue)}</Text>
              </View>
            ))}
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="font-semibold text-gray-800 mb-3">สินค้าขายดี</Text>
            {data.topProducts.length === 0 ? (
              <Text className="text-gray-400 text-sm">ยังไม่มีข้อมูล</Text>
            ) : data.topProducts.map((p, i) => (
              <View key={i} className={`flex-row justify-between py-1.5 ${i < data.topProducts.length - 1 ? "border-b border-gray-50" : ""}`}>
                <Text className="text-sm text-gray-700 flex-1 mr-2" numberOfLines={1}>{p.product_name}</Text>
                <Text className="text-sm text-gray-500">ขาย {p.total_qty}</Text>
                <Text className="text-sm font-medium text-primary-600 ml-2">{fmt(p.total_revenue)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
