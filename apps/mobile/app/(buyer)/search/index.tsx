import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"
import { useResponsive } from "../../../lib/hooks/useResponsive"

const PER_PAGE = 20

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>()
  const [query, setQuery] = useState(params.q ?? "")
  const [q, setQ] = useState(params.q ?? "")
  const [products, setProducts] = useState<any[]>([])
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const { productColumns, cardGap, horizontalPadding } = useResponsive()

  useEffect(() => {
    if (!q) return
    setLoading(true)
    setPage(1)
    const enc = encodeURIComponent(q)
    Promise.all([
      api.get(`/products?search=${enc}&province=${enc}&limit=${PER_PAGE}&page=1`),
      api.get(`/communities?search=${enc}&limit=12`),
    ]).then(([p, c]) => {
      const rows = p.data.data || []
      setProducts(rows)
      setHasMore(rows.length === PER_PAGE)
      setCommunities(c.data.data || [])
    }).finally(() => setLoading(false))
  }, [q])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    const enc = encodeURIComponent(q)
    try {
      const r = await api.get(`/products?search=${enc}&province=${enc}&limit=${PER_PAGE}&page=${next}`)
      const rows = r.data.data || []
      setProducts(prev => [...prev, ...rows])
      setHasMore(rows.length === PER_PAGE)
      setPage(next)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-2 px-4 pt-3 pb-2">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <View className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2.5 flex-row items-center gap-2">
          <Text className="text-gray-400">🔍</Text>
          <TextInput
            className="flex-1 text-gray-800"
            placeholder="ค้นหาสินค้า ชุมชน จังหวัด..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setQ(query.trim())}
            returnKeyType="search"
            autoFocus
          />
        </View>
      </View>

      <FlatList
        key={productColumns}
        data={!q ? [] : products}
        numColumns={productColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: horizontalPadding, gap: cardGap }}
        columnWrapperStyle={{ gap: cardGap }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={() => (
          !q ? null : communities.length === 0 ? null : (
            <View className="mb-4">
              <Text className="font-bold text-gray-800 mb-2">ชุมชน ({communities.length})</Text>
              <FlatList
                horizontal
                data={communities}
                keyExtractor={(c) => c.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => router.push(`/(buyer)/community/${item.slug}`)}
                    className="w-32 bg-white rounded-xl border border-gray-100 p-3 items-center"
                  >
                    <Text className="text-2xl mb-1">🏘️</Text>
                    <Text className="text-xs font-medium text-gray-800 text-center" numberOfLines={2}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <Text className="font-bold text-gray-800 mt-4 mb-1">สินค้า ({products.length})</Text>
            </View>
          )
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(buyer)/product/${item.id}`)}
            className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
          >
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
        ListFooterComponent={() => loadingMore ? <ActivityIndicator className="my-4" color="#16a34a" /> : null}
        ListEmptyComponent={() => (
          <View className="items-center py-20">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="text-gray-400">
              {!q ? "พิมพ์คำค้นหาด้านบนเพื่อเริ่มค้นหา" : loading ? "กำลังค้นหา..." : `ไม่พบผลลัพธ์สำหรับ "${q}"`}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
