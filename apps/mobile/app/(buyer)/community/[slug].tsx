import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"
import { useAuthStore } from "../../../lib/store/auth"
import { useResponsive } from "../../../lib/hooks/useResponsive"

interface Community {
  id: string; name: string; province: string; district: string; description?: string
  logoUrl?: string; bannerUrl?: string; memberCount: number; isVerified: boolean
}

export default function CommunityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const user = useAuthStore(s => s.user)
  const [community, setCommunity] = useState<Community | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [shop, setShop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startingChat, setStartingChat] = useState(false)
  const { productColumns, cardGap, horizontalPadding } = useResponsive()

  useEffect(() => {
    api.get(`/communities/${slug}`).then(r => {
      const d = r.data.data
      setCommunity(d.community)
      setProducts(d.products || [])
      setShop(d.shop)
    }).finally(() => setLoading(false))
  }, [slug])

  async function startChat() {
    if (!shop || !user) return router.push("/(auth)/login")
    if (shop.ownerId === user.id) return
    setStartingChat(true)
    try {
      const res = await api.post("/chat/conversations", { sellerId: shop.ownerId })
      router.push({ pathname: "/(buyer)/chat", params: { c: res.data.data.id } })
    } finally { setStartingChat(false) }
  }

  if (loading) return <SafeAreaView className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#16a34a" /></SafeAreaView>
  if (!community) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-gray-400 mb-4">ไม่พบชุมชนนี้</Text>
      <TouchableOpacity onPress={() => router.back()}><Text className="text-primary-600 font-medium">กลับ</Text></TouchableOpacity>
    </SafeAreaView>
  )

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <FlatList
        key={productColumns}
        data={products}
        numColumns={productColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: horizontalPadding, gap: cardGap }}
        columnWrapperStyle={{ gap: cardGap }}
        ListHeaderComponent={() => (
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
            </View>
            <View className="bg-white rounded-2xl p-4 mb-1">
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-14 h-14 rounded-2xl bg-primary-100 items-center justify-center overflow-hidden">
                  {community.logoUrl
                    ? <Image source={{ uri: community.logoUrl }} style={{ width: "100%", height: "100%" }} />
                    : <Text className="text-2xl">🏘️</Text>}
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900" numberOfLines={1}>{community.name}</Text>
                  <Text className="text-xs text-gray-500">📍 {community.district}, {community.province}</Text>
                </View>
              </View>
              {community.isVerified && (
                <View className="self-start bg-blue-50 px-2 py-1 rounded-full mb-2"><Text className="text-xs text-blue-600 font-medium">✓ ยืนยันแล้ว</Text></View>
              )}
              {community.description && <Text className="text-sm text-gray-600 mb-2">{community.description}</Text>}
              <Text className="text-xs text-gray-400">{products.length} สินค้า · {community.memberCount} สมาชิก</Text>

              {shop && (
                <TouchableOpacity onPress={startChat} disabled={startingChat} className="mt-3 bg-primary-600 rounded-xl py-2.5 items-center">
                  <Text className="text-white font-semibold text-sm">{startingChat ? "..." : "💬 แชทกับผู้ขาย"}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="font-bold text-gray-800 mt-4">สินค้าในชุมชน ({products.length})</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(buyer)/product/${item.id}`)} className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <View className="aspect-square bg-gray-100 items-center justify-center">
              {item.images?.[0]
                ? <Image source={{ uri: item.images[0] }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                : <Text className="text-5xl">🛒</Text>}
            </View>
            <View className="p-3">
              <Text className="font-medium text-gray-900 text-sm" numberOfLines={2}>{item.name}</Text>
              <Text className="text-primary-600 font-bold mt-1">฿{Number(item.price).toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => <Text className="text-gray-400 text-center py-10">ยังไม่มีสินค้าในชุมชนนี้</Text>}
      />
    </SafeAreaView>
  )
}
