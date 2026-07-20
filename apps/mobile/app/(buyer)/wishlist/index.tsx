import { View, Text, FlatList, TouchableOpacity, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"
import { useCartStore } from "../../../lib/store/cart"
import { useWishlistStore } from "../../../lib/store/wishlist"

interface WishlistProduct {
  id: string
  name: string
  price: string
  images: string[]
  stock: number
  shop: { id: string; name: string; community: { name: string } }
}

export default function WishlistScreen() {
  const { remove } = useWishlistStore()
  const { addItem } = useCartStore()
  const [products, setProducts] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/wishlist").then(r => setProducts(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  async function handleRemove(id: string) {
    await remove(id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">รายการโปรด</Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-6 gap-3"
        refreshing={loading}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex-row">
            <TouchableOpacity onPress={() => router.push(`/(buyer)/product/${item.id}`)} className="w-24 h-24 bg-gray-100 items-center justify-center">
              {item.images?.[0]
                ? <Image source={{ uri: item.images[0] }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                : <Text className="text-3xl">🛒</Text>}
            </TouchableOpacity>
            <View className="flex-1 p-3 justify-between">
              <TouchableOpacity onPress={() => router.push(`/(buyer)/product/${item.id}`)}>
                <Text className="font-medium text-gray-900 text-sm" numberOfLines={2}>{item.name}</Text>
                <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>📍 {item.shop.community.name}</Text>
              </TouchableOpacity>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-primary-600 font-bold text-sm">฿{Number(item.price).toLocaleString()}</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => handleRemove(item.id)} className="w-8 h-8 rounded-full bg-red-50 items-center justify-center">
                    <Text>❤️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => addItem(
                      { id: item.id, name: item.name, price: Number(item.price), stock: item.stock, images: item.images },
                      item.shop.id, item.shop.name, 1
                    )}
                    className="w-8 h-8 rounded-full bg-primary-600 items-center justify-center"
                  >
                    <Text className="text-white text-xs">🛒</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">🤍</Text>
            <Text className="text-gray-400">{loading ? "กำลังโหลด..." : "ยังไม่มีสินค้าในรายการโปรด"}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
