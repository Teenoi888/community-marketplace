import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"
import { useAuthStore } from "../../../lib/store/auth"
import { useCartStore } from "../../../lib/store/cart"
import { useWishlistStore } from "../../../lib/store/wishlist"
import { useResponsive } from "../../../lib/hooks/useResponsive"

interface Product {
  id: string
  name: string
  description?: string
  price: string
  stock: number
  images: string[]
  category: string
  shop: { id: string; name: string; ownerId: string; community: { name: string; slug: string; province: string } }
}

interface Review {
  id: string
  rating: number
  comment?: string
  created_at: string
  user_name: string
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Text key={s} style={{ fontSize: size, color: s <= rating ? "#facc15" : "#e5e7eb" }}>★</Text>
      ))}
    </View>
  )
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore(s => s.user)
  const { addItem } = useCartStore()
  const { has, toggle, load } = useWishlistStore()
  const { horizontalPadding } = useResponsive()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [startingChat, setStartingChat] = useState(false)

  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [eligibility, setEligibility] = useState<{ eligible: boolean; alreadyReviewed: boolean; orderId: string | null } | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!id) return
    api.get(`/products/${id}`).then(r => setProduct(r.data?.data ?? null)).finally(() => setLoading(false))
    api.get(`/reviews?productId=${id}`).then(r => {
      setReviews(r.data.data || [])
      setAvgRating(r.data.avgRating || 0)
      setTotalReviews(r.data.total || 0)
    }).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id || !user) return
    api.get(`/reviews/eligibility?productId=${id}`).then(r => setEligibility(r.data)).catch(() => {})
  }, [id, user])

  async function submitReview() {
    if (!eligibility?.orderId) return
    setSubmittingReview(true)
    try {
      await api.post("/reviews", {
        productId: id, orderId: eligibility.orderId,
        rating: reviewRating, comment: reviewComment.trim() || undefined,
      })
      Alert.alert("สำเร็จ", "รีวิวสำเร็จ! ขอบคุณ")
      setEligibility({ ...eligibility, eligible: false, alreadyReviewed: true })
      const r = await api.get(`/reviews?productId=${id}`)
      setReviews(r.data.data || [])
      setAvgRating(r.data.avgRating || 0)
      setTotalReviews(r.data.total || 0)
    } catch (e: any) {
      Alert.alert("ข้อผิดพลาด", e?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setSubmittingReview(false)
    }
  }

  function addToCart() {
    if (!product) return
    if (!user) return router.push("/(auth)/login")
    setAddingToCart(true)
    try {
      addItem(
        { id: product.id, name: product.name, price: parseFloat(product.price), stock: product.stock, images: product.images || [] },
        product.shop.id, product.shop.name, qty
      )
      Alert.alert("สำเร็จ", "เพิ่มลงตะกร้าแล้ว!")
    } finally {
      setAddingToCart(false)
    }
  }

  async function startChat() {
    if (!product) return
    if (!user) return router.push("/(auth)/login")
    if (product.shop.ownerId === user.id) return Alert.alert("นี่คือร้านของคุณเอง")
    setStartingChat(true)
    try {
      const res = await api.post("/chat/conversations", { sellerId: product.shop.ownerId })
      router.push({ pathname: "/(buyer)/chat", params: { c: res.data.data.id } })
    } catch {
      Alert.alert("ข้อผิดพลาด", "เริ่มแชทไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setStartingChat(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    )
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-5xl mb-3">📦</Text>
        <Text className="text-gray-500 mb-4">ไม่พบสินค้า</Text>
        <TouchableOpacity onPress={() => router.back()}><Text className="text-primary-600 font-medium">กลับ</Text></TouchableOpacity>
      </SafeAreaView>
    )
  }

  const wished = has(product.id)

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView>
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => toggle(product.id)}>
            <Text className="text-2xl">{wished ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View className="bg-gray-100 items-center justify-center" style={{ aspectRatio: 1 }}>
          {product.images?.[selectedImage]
            ? <Image source={{ uri: product.images[selectedImage] }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            : <Text className="text-7xl">🛒</Text>}
        </View>
        {product.images?.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 py-3 gap-2">
            {product.images.map((img, i) => (
              <TouchableOpacity key={i} onPress={() => setSelectedImage(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${i === selectedImage ? "border-primary-500" : "border-transparent"}`}>
                <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: horizontalPadding }} className="pt-2 pb-28">
          <Text className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full self-start overflow-hidden">
            {product.category}
          </Text>
          <Text className="text-xl font-bold text-gray-900 mt-2">{product.name}</Text>

          {totalReviews > 0 && (
            <View className="flex-row items-center gap-2 mt-1.5">
              <Stars rating={Math.round(avgRating)} />
              <Text className="text-sm text-gray-500">{avgRating.toFixed(1)} ({totalReviews} รีวิว)</Text>
            </View>
          )}

          <Text className="text-2xl font-bold text-primary-600 mt-3">฿{Number(product.price).toLocaleString()}</Text>

          <TouchableOpacity
            onPress={() => router.push(`/(buyer)/community/${product.shop.community.slug}`)}
            className="flex-row items-center gap-1.5 mt-3"
          >
            <Text className="text-gray-400">📍</Text>
            <Text className="text-sm text-gray-500 underline">{product.shop.community.name} · {product.shop.community.province}</Text>
          </TouchableOpacity>

          {product.description ? (
            <Text className="text-gray-600 text-sm mt-4 leading-5">{product.description}</Text>
          ) : null}

          <View className="flex-row items-center gap-3 mt-2">
            <Text className="text-sm text-gray-500">คงเหลือ {product.stock} ชิ้น</Text>
          </View>

          {/* Qty stepper */}
          <View className="flex-row items-center gap-3 mt-4">
            <Text className="text-sm font-medium text-gray-700">จำนวน</Text>
            <View className="flex-row items-center border border-gray-200 rounded-full">
              <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 items-center justify-center">
                <Text className="text-gray-600 font-bold text-lg">-</Text>
              </TouchableOpacity>
              <Text className="w-8 text-center font-medium">{qty}</Text>
              <TouchableOpacity onPress={() => setQty(q => Math.min(product.stock, q + 1))} className="w-9 h-9 items-center justify-center">
                <Text className="text-gray-600 font-bold text-lg">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reviews */}
          <View className="mt-8 pt-6 border-t border-gray-100">
            <Text className="font-bold text-gray-900 mb-3">รีวิวสินค้า ({totalReviews})</Text>

            {eligibility?.eligible && (
              <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                <Text className="font-medium text-gray-800 mb-2">คุณซื้อสินค้านี้ไปแล้ว ให้คะแนนได้เลย</Text>
                <View className="flex-row gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                      <Text style={{ fontSize: 28, color: s <= reviewRating ? "#facc15" : "#e5e7eb" }}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="เขียนความคิดเห็น (ไม่บังคับ)"
                  multiline
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm min-h-[70px]"
                />
                <TouchableOpacity
                  onPress={submitReview}
                  disabled={submittingReview}
                  className="bg-primary-600 rounded-xl py-3 items-center mt-3"
                >
                  <Text className="text-white font-semibold">{submittingReview ? "กำลังส่ง..." : "ส่งรีวิว"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {reviews.length === 0 ? (
              <Text className="text-gray-400 text-sm">ยังไม่มีรีวิว</Text>
            ) : reviews.map((r, i) => (
              <View key={r.id} className={`mb-4 pb-4 ${i < reviews.length - 1 ? "border-b border-gray-50" : ""}`}>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-medium text-gray-800 text-sm">{r.user_name}</Text>
                  <Stars rating={r.rating} size={12} />
                </View>
                {r.comment && <Text className="text-gray-600 text-sm">{r.comment}</Text>}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-t border-gray-100">
        <TouchableOpacity onPress={startChat} disabled={startingChat} className="w-12 h-12 rounded-xl border border-gray-200 items-center justify-center">
          <Text className="text-xl">💬</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={addToCart}
          disabled={addingToCart || product.stock === 0}
          className={`flex-1 rounded-xl py-3.5 items-center ${product.stock === 0 ? "bg-gray-200" : "bg-primary-600"}`}
        >
          <Text className={`font-bold ${product.stock === 0 ? "text-gray-400" : "text-white"}`}>
            {product.stock === 0 ? "สินค้าหมด" : addingToCart ? "กำลังเพิ่ม..." : "เพิ่มลงตะกร้า"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
