import { View, Text, FlatList, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../../lib/api"

const STATUS_MAP: Record<string, { label: string; color: string; emoji: string }> = {
  pending_payment: { label: "รอชำระ",    color: "bg-yellow-100 text-yellow-700", emoji: "⏳" },
  paid:            { label: "ชำระแล้ว",  color: "bg-blue-100 text-blue-700",    emoji: "✅" },
  preparing:       { label: "เตรียมสินค้า", color: "bg-purple-100 text-purple-700", emoji: "📦" },
  shipped:         { label: "จัดส่งแล้ว", color: "bg-indigo-100 text-indigo-700", emoji: "🚚" },
  delivered:       { label: "ได้รับสินค้า", color: "bg-green-100 text-green-700", emoji: "🎉" },
  cancelled:       { label: "ยกเลิก",     color: "bg-red-100 text-red-700",     emoji: "❌" },
}

export default function OrdersScreen() {
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get("/orders")
      return data.data
    },
  })

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">📦 ออเดอร์ของฉัน</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#16a34a"]} />}
        renderItem={({ item }) => {
          const status = STATUS_MAP[item.status] || STATUS_MAP.pending_payment
          return (
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="font-medium text-gray-500 text-xs">
                  #{item.id.slice(0, 8).toUpperCase()}
                </Text>
                <View className={`px-2 py-1 rounded-full ${status.color.split(" ")[0]}`}>
                  <Text className={`text-xs font-semibold ${status.color.split(" ")[1]}`}>
                    {status.emoji} {status.label}
                  </Text>
                </View>
              </View>

              {item.items?.map((oi: any) => (
                <View key={oi.id} className="flex-row justify-between py-1">
                  <Text className="text-sm text-gray-700" numberOfLines={1}>{oi.productName}</Text>
                  <Text className="text-sm text-gray-500">x{oi.qty}</Text>
                </View>
              ))}

              <View className="border-t border-gray-100 mt-3 pt-3 flex-row justify-between">
                <Text className="text-gray-500 text-sm">รวม</Text>
                <Text className="font-bold text-primary-600">฿{Number(item.total).toLocaleString()}</Text>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl mb-3">📭</Text>
            <Text className="text-gray-400">ยังไม่มีออเดอร์</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
