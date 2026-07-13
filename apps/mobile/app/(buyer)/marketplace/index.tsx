import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../../lib/api"

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด", emoji: "🛒" },
  { id: "agriculture", label: "เกษตร", emoji: "🌾" },
  { id: "processed_food", label: "อาหาร", emoji: "🥫" },
  { id: "fresh_produce", label: "ผักสด", emoji: "🥬" },
  { id: "handicraft", label: "งานฝีมือ", emoji: "🧶" },
  { id: "herb", label: "สมุนไพร", emoji: "🌿" },
]

async function fetchProducts(category: string) {
  const params = category !== "all" ? `?category=${category}` : ""
  const { data } = await api.get(`/products${params}`)
  return data.data
}

export default function MarketplaceScreen() {
  const [category, setCategory] = useState("all")
  const [search, setSearch] = useState("")

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["products", category],
    queryFn: () => fetchProducts(category),
  })

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-600 px-4 pt-2 pb-4">
        <Text className="text-white text-xl font-bold mb-3">🏪 ตลาดชุมชน</Text>
        <View className="bg-white rounded-xl px-4 py-2.5 flex-row items-center gap-2">
          <Text className="text-gray-400">🔍</Text>
          <TextInput
            className="flex-1 text-gray-800"
            placeholder="ค้นหาสินค้า ชุมชน..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-gray-100">
        <View className="flex-row gap-2 px-4 py-3">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              className={`flex-row items-center gap-1 px-4 py-2 rounded-full ${
                category === cat.id ? "bg-primary-600" : "bg-gray-100"
              }`}
            >
              <Text>{cat.emoji}</Text>
              <Text className={`text-sm font-medium ${category === cat.id ? "text-white" : "text-gray-600"}`}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Products Grid */}
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-3 gap-3"
        columnWrapperClassName="gap-3"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#16a34a"]} />}
        renderItem={({ item }) => (
          <TouchableOpacity className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <View className="aspect-square bg-gray-100 items-center justify-center">
              <Text className="text-5xl">{item.images?.[0] ? "🖼" : "🛒"}</Text>
            </View>
            <View className="p-3">
              <Text className="font-medium text-gray-900 text-sm" numberOfLines={2}>{item.name}</Text>
              <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                📍 {item.shop?.community?.name || "ชุมชน"}
              </Text>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-primary-600 font-bold">
                  ฿{Number(item.price).toLocaleString()}
                </Text>
                <TouchableOpacity className="bg-primary-600 rounded-lg p-1.5">
                  <Text className="text-white text-xs">+ ตะกร้า</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-4xl mb-3">🌾</Text>
            <Text className="text-gray-400 text-center">
              {isLoading ? "กำลังโหลด..." : "ยังไม่มีสินค้าในหมวดนี้"}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
