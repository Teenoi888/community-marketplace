import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList, RefreshControl, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../../lib/api"
import { useCartStore } from "../../../lib/store/cart"
import { useWishlistStore } from "../../../lib/store/wishlist"
import { useResponsive } from "../../../lib/hooks/useResponsive"

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
  const { addItem } = useCartStore()
  const { has, toggle, load } = useWishlistStore()
  const { productColumns, cardGap, horizontalPadding } = useResponsive()

  useEffect(() => { load() }, [])

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["products", category],
    queryFn: () => fetchProducts(category),
  })

  function submitSearch() {
    if (!search.trim()) return
    router.push({ pathname: "/(buyer)/search", params: { q: search.trim() } })
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-600 px-4 pt-2 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-xl font-bold">🏪 ตลาดชุมชน</Text>
          <TouchableOpacity onPress={() => router.push("/(buyer)/live")} className="flex-row items-center gap-1 bg-red-600/90 px-3 py-1.5 rounded-full">
            <Text className="text-white text-xs font-bold">🔴 ไลฟ์สด</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-white rounded-xl px-4 py-2.5 flex-row items-center gap-2">
          <Text className="text-gray-400">🔍</Text>
          <TextInput
            className="flex-1 text-gray-800"
            placeholder="ค้นหาสินค้า ชุมชน..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
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

      {/* Products Grid — column count adapts to screen width (2 phones, 3 large phones, 4 tablets) */}
      <FlatList
        key={productColumns}
        data={products}
        numColumns={productColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: horizontalPadding, gap: cardGap }}
        columnWrapperStyle={{ gap: cardGap }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#16a34a"]} />}
        renderItem={({ item }) => {
          const wished = has(item.id)
          return (
            <TouchableOpacity
              onPress={() => router.push(`/(buyer)/product/${item.id}`)}
              className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
            >
              <View className="aspect-square bg-gray-100 items-center justify-center">
                {item.images?.[0]
                  ? <Image source={{ uri: item.images[0] }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  : <Text className="text-5xl">🛒</Text>}
                <TouchableOpacity
                  onPress={() => toggle(item.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 items-center justify-center"
                >
                  <Text>{wished ? "❤️" : "🤍"}</Text>
                </TouchableOpacity>
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
                  <TouchableOpacity
                    onPress={() => addItem(
                      { id: item.id, name: item.name, price: Number(item.price), stock: item.stock, images: item.images || [] },
                      item.shop.id, item.shop.name, 1
                    )}
                    className="bg-primary-600 rounded-lg p-1.5"
                  >
                    <Text className="text-white text-xs">+ ตะกร้า</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
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
