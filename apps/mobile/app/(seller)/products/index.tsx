import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../../lib/api"

export default function SellerProductsScreen() {
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const { data } = await api.get("/products?mine=true")
      return data.data
    },
  })

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-4">
        <Text className="text-xl font-bold text-gray-900">สินค้าของฉัน</Text>
        <TouchableOpacity
          onPress={() => router.push("/(seller)/products/new")}
          className="bg-primary-600 px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold text-sm">+ เพิ่มสินค้า</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-3 pb-6"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#16a34a"]} />}
        renderItem={({ item }) => (
          <TouchableOpacity className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-row items-center gap-4">
            <View className="w-16 h-16 bg-gray-100 rounded-xl items-center justify-center">
              <Text className="text-3xl">🛒</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
              <Text className="text-primary-600 font-bold mt-1">฿{Number(item.price).toLocaleString()}</Text>
              <View className="flex-row items-center gap-3 mt-1">
                <Text className="text-gray-400 text-xs">คงเหลือ: {item.stock} ชิ้น</Text>
                <View className={`px-2 py-0.5 rounded-full ${item.status === "active" ? "bg-green-100" : "bg-gray-100"}`}>
                  <Text className={`text-xs ${item.status === "active" ? "text-green-700" : "text-gray-500"}`}>
                    {item.status === "active" ? "ขายอยู่" : "หยุดขาย"}
                  </Text>
                </View>
              </View>
            </View>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">📦</Text>
            <Text className="text-gray-400 mb-4">ยังไม่มีสินค้า</Text>
            <TouchableOpacity
              onPress={() => router.push("/(seller)/products/new")}
              className="bg-primary-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">เพิ่มสินค้าแรก</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
