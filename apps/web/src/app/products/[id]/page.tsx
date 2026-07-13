"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, ArrowLeft, Store, MapPin, Package, MessageSquare } from "lucide-react"
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

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(r => setProduct(r.data.data))
      .catch(() => router.push("/"))
      .finally(() => setLoading(false))
  }, [id])

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
      <div className="max-w-4xl mx-auto px-4 py-6">
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
          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{product.category}</span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{product.name}</h1>
              <p className="text-3xl font-bold text-primary-600 mt-1">฿{price.toLocaleString()}</p>
            </div>

            {product.description && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 mb-2">รายละเอียดสินค้า</h2>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Shop info */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
              <Link href={`/communities/${product.shop.community?.slug}`}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.shop.name}</p>
                  {product.shop.community && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {product.shop.community.district}, {product.shop.community.province}
                    </p>
                  )}
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

            {/* Stock */}
            <p className="text-sm text-gray-500">คงเหลือ <span className="font-medium text-gray-700">{product.stock}</span> ชิ้น</p>

            {/* Qty */}
            {product.stock > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">จำนวน</span>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-lg font-bold">−</button>
                  <span className="w-12 text-center font-medium">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-lg font-bold">+</button>
                </div>
              </div>
            )}

            {/* Add to cart */}
            <button
              onClick={addToCart}
              disabled={product.stock === 0 || addingToCart}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              {product.stock === 0 ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
