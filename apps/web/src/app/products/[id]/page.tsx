"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, ArrowLeft, Store, MapPin, Package, MessageSquare, Star } from "lucide-react"
import { api } from "@/lib/api"
import { useCartStore } from "@/lib/store/cart"
import { useAuthStore } from "@/lib/store/auth"
import { MainNav } from "@/components/layout/MainNav"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  description?: string
  price: string
  stock: number
  images: string[]
  category: string
  status: string
  shop: {
    id: string
    name: string
    ownerId: string
    community: {
      name: string
      slug: string
      province: string
      district: string
    }
  }
}

interface Review {
  id: string
  rating: number
  comment?: string
  created_at: string
  user_name: string
  avatar_url?: string
}

function StarRow({ rating, size = 16, interactive = false, onChange }: {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (r: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          width={size} height={size}
          className={`transition-colors ${interactive ? "cursor-pointer" : ""}
            ${s <= (interactive ? (hover || rating) : rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"}`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(s)}
        />
      ))}
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [startingChat, setStartingChat] = useState(false)
  const { addItem } = useCartStore()
  const user = useAuthStore((s) => s.user)

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [eligibility, setEligibility] = useState<{ eligible: boolean; alreadyReviewed: boolean; orderId: string | null } | null>(null)
  const [shopRating, setShopRating] = useState<{ avgRating: number; totalReviews: number } | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(r => {
        const p = r.data.data
        setProduct(p)
        // Fetch shop rating once we know the shop id
        if (p?.shop?.id) {
          api.get(`/shops/${p.shop.id}/rating`)
            .then(sr => setShopRating(sr.data.data))
            .catch(() => {})
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    api.get(`/reviews?productId=${id}`)
      .then(r => {
        setReviews(r.data.data || [])
        setAvgRating(r.data.avgRating || 0)
        setTotalReviews(r.data.total || 0)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id || !user) return
    api.get(`/reviews/eligibility?productId=${id}`)
      .then(r => setEligibility(r.data))
      .catch(() => {})
  }, [id, user])

  async function submitReview() {
    if (!eligibility?.orderId || !reviewRating) return
    setSubmittingReview(true)
    try {
      await api.post("/reviews", {
        productId: id,
        orderId: eligibility.orderId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      })
      toast.success("รีวิวสำเร็จ! ขอบคุณ")
      setEligibility({ ...eligibility, eligible: false, alreadyReviewed: true })
      // Refresh reviews
      const r = await api.get(`/reviews?productId=${id}`)
      setReviews(r.data.data || [])
      setAvgRating(r.data.avgRating || 0)
      setTotalReviews(r.data.total || 0)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setSubmittingReview(false)
    }
  }

  function addToCart() {
    if (!product) return
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้า", {
        action: { label: "เข้าสู่ระบบ", onClick: () => router.push("/login") },
      })
      return
    }
    setAddingToCart(true)
    try {
      addItem(
        {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          stock: product.stock,
          images: product.images || [],
        },
        product.shop.id,
        product.shop.name,
        qty
      )
      toast.success("เพิ่มลงตะกร้าแล้ว!")
    } catch {
      toast.error("เกิดข้อผิดพลาด")
    } finally {
      setAddingToCart(false)
    }
  }

  async function startChat() {
    if (!product) return
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนแชทกับผู้ขาย", {
        action: { label: "เข้าสู่ระบบ", onClick: () => router.push("/login") },
      })
      return
    }
    if (product.shop.ownerId === user.id) {
      toast.error("นี่คือร้านของคุณเอง")
      return
    }
    setStartingChat(true)
    try {
      const res = await api.post("/chat/conversations", { sellerId: product.shop.ownerId })
      router.push(`/chat?c=${res.data.data.id}`)
    } catch {
      toast.error("เริ่มแชทไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setStartingChat(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <MainNav />
        <div className="flex items-center justify-center h-64 text-gray-400">กำลังโหลด...</div>
      </main>
    )
  }

  if (!product) return null

  const price = parseFloat(product.price)

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
              {product.images?.length > 0
                ? <Image src={product.images[selectedImage]} alt={product.name} fill className="object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-24 h-24 text-gray-300" />
                  </div>
              }
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 ${i === selectedImage ? "border-primary-500" : "border-transparent"}`}>
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5 pb-24 md:pb-0">
            {/* 1. Identity: category, title, rating */}
            <div>
              <span className="inline-block text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
                {product.category}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{product.name}</h1>
              {totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <StarRow rating={Math.round(avgRating)} size={14} />
                  <span className="text-sm font-semibold text-yellow-600">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({totalReviews} รีวิว)</span>
                </div>
              )}
            </div>

            {/* 2. Description — read before deciding to buy */}
            {product.description && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">รายละเอียดสินค้า</h2>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* 3. Purchase card: price, stock, qty, CTA — kept together as one decision flow */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-primary-600">฿{price.toLocaleString()}</p>
                <p className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                  product.stock === 0 ? "bg-red-50 text-red-600"
                  : product.stock <= 5 ? "bg-orange-50 text-orange-600"
                  : "bg-gray-100 text-gray-600"
                }`}>
                  {product.stock === 0 ? "สินค้าหมด" : `คงเหลือ ${product.stock} ชิ้น`}
                </p>
              </div>

              {product.stock > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">จำนวน</span>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-lg font-bold text-gray-700">−</button>
                    <span className="w-12 text-center font-medium text-gray-900">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-lg font-bold text-gray-700">+</button>
                  </div>
                </div>
              )}

              <button
                onClick={addToCart}
                disabled={product.stock === 0 || addingToCart}
                className="hidden md:flex w-full btn-primary py-4 items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                {product.stock === 0 ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
              </button>
            </div>

            {/* 4. Shop info — secondary to the purchase decision */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <Link href={`/communities/${product.shop.community?.slug}`}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.shop.name}</p>
                  {shopRating && shopRating.totalReviews > 0 ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} width={11} height={11}
                          className={s <= Math.round(shopRating.avgRating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                      ))}
                      <span className="text-xs text-yellow-600 font-semibold ml-0.5">{shopRating.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({shopRating.totalReviews})</span>
                    </div>
                  ) : product.shop.community ? (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {product.shop.community.district}, {product.shop.community.province}
                    </p>
                  ) : null}
                </div>
              </Link>
              <button
                onClick={startChat}
                disabled={startingChat}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                แชท
              </button>
            </div>
          </div>
        </div>

        {/* Sticky add-to-cart on mobile so the CTA stays reachable while scrolling */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
          <button
            onClick={addToCart}
            disabled={product.stock === 0 || addingToCart}
            className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            {product.stock === 0 ? "สินค้าหมด" : `เพิ่มลงตะกร้า · ฿${(price * qty).toLocaleString()}`}
          </button>
        </div>

        {/* ── Reviews Section ── */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            รีวิวสินค้า
            {totalReviews > 0 && <span className="text-sm font-normal text-gray-500">({totalReviews} รีวิว)</span>}
          </h2>

          {/* Summary bar */}
          {totalReviews > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
                <StarRow rating={Math.round(avgRating)} size={18} />
                <p className="text-xs text-gray-500 mt-1">{totalReviews} รีวิว</p>
              </div>
            </div>
          )}

          {/* Review form — only for eligible buyers */}
          {user && eligibility?.eligible && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-primary-100 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3">เขียนรีวิวสินค้า</h3>
              <div className="mb-3">
                <p className="text-sm text-gray-500 mb-1.5">คะแนน</p>
                <StarRow rating={reviewRating} size={28} interactive onChange={setReviewRating} />
              </div>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="เขียนรีวิวสินค้า (ไม่บังคับ)..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <button
                onClick={submitReview}
                disabled={submittingReview || reviewRating === 0}
                className="mt-3 btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
              >
                {submittingReview ? "กำลังส่ง..." : "ส่งรีวิว"}
              </button>
            </div>
          )}

          {user && eligibility?.alreadyReviewed && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4 text-sm text-green-700 font-medium">
              ✅ คุณได้รีวิวสินค้านี้แล้ว
            </div>
          )}

          {/* Review list */}
          {reviews.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>ยังไม่มีรีวิว</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {review.avatar_url
                        ? <Image src={review.avatar_url} alt="" width={32} height={32} className="rounded-full" />
                        : <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                            {review.user_name.charAt(0)}
                          </div>
                      }
                      <span className="font-medium text-gray-800 text-sm">{review.user_name}</span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(review.created_at).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                  <StarRow rating={review.rating} size={14} />
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
