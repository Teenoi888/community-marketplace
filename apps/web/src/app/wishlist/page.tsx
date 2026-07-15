"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Heart, ShoppingCart, MapPin, ArrowLeft, Package } from "lucide-react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"
import { useCartStore } from "@/lib/store/cart"
import { useWishlistStore } from "@/lib/store/wishlist"
import { MainNav } from "@/components/layout/MainNav"
import { toast } from "sonner"

interface WishlistProduct {
  id: string
  name: string
  price: string
  images: string[]
  stock: number
  category: string
  shop: { id: string; name: string; community: { name: string; slug: string } }
}

function fmt(price: string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(Number(price))
}

export default function WishlistPage() {
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  const { addItem } = useCartStore()
  const { remove } = useWishlistStore()
  const [products, setProducts] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push("/login"); return }
    api.get("/wishlist")
      .then(r => setProducts(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  async function handleRemove(productId: string, name: string) {
    await remove(productId)
    setProducts(ps => ps.filter(p => p.id !== productId))
    toast.success(`ลบ "${name}" ออกจากรายการโปรดแล้ว`)
  }

  function handleAddToCart(p: WishlistProduct) {
    addItem(
      { id: p.id, name: p.name, price: Number(p.price), stock: p.stock, images: p.images },
      p.shop.id,
      p.shop.name,
      1
    )
    toast.success(`เพิ่ม "${p.name}" ในตะกร้าแล้ว`)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              รายการโปรด
            </h1>
            <p className="text-sm text-gray-500">
              {loading ? "กำลังโหลด..." : `${products.length} รายการ`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 font-medium mb-1">ยังไม่มีสินค้าในรายการโปรด</p>
            <p className="text-gray-400 text-sm mb-6">กดปุ่มหัวใจบนสินค้าที่ชอบเพื่อบันทึกไว้</p>
            <Link href="/" className="btn-primary inline-flex items-center gap-2">
              <Package className="w-4 h-4" /> ดูสินค้าทั้งหมด
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex group hover:shadow-md transition-shadow">

                {/* Image */}
                <Link href={`/products/${p.id}`} className="relative w-28 h-28 flex-shrink-0 bg-gray-100">
                  {p.images?.[0]
                    ? <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
                  }
                  {p.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">หมด</span>
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <Link href={`/products/${p.id}`}>
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 hover:text-primary-600 transition-colors">
                        {p.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <Link href={`/communities/${p.shop.community.slug}`} className="hover:text-primary-500 line-clamp-1">
                        {p.shop.community.name}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-primary-600 font-bold text-sm">{fmt(p.price)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRemove(p.id, p.name)}
                        className="w-7 h-7 rounded-full bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="ลบออกจากรายการโปรด"
                      >
                        <Heart className="w-3.5 h-3.5 fill-red-400" />
                      </button>
                      <button
                        onClick={() => handleAddToCart(p)}
                        disabled={p.stock === 0}
                        className="w-7 h-7 rounded-full bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center transition-colors disabled:opacity-40"
                        title="เพิ่มลงตะกร้า"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
