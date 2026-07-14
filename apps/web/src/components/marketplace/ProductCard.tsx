"use client"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShoppingCart, MapPin } from "lucide-react"
import { useCartStore } from "@/lib/store/cart"
import { useAuthStore } from "@/lib/store/auth"
import { toast } from "sonner"
import type { ProductWithShop } from "@cm/types"

interface ProductCardProps {
  product: ProductWithShop
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(price)
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้า", {
        action: { label: "เข้าสู่ระบบ", onClick: () => router.push("/login") },
      })
      return
    }
    addItem(
      { id: product.id, name: product.name, price: product.price, stock: product.stock, images: product.images },
      product.shop.id,
      product.shop.name,
      1
    )
    toast.success(`เพิ่ม "${product.name}" ในตะกร้าแล้ว`)
  }

  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="card hover:shadow-md transition-shadow p-0 overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🛒</div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">สินค้าหมด</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors h-10">
            {product.name}
          </h3>

          <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{product.shop.community.name}</span>
            {product.distanceKm != null && (
              <span className="flex-shrink-0 text-primary-600 font-medium">
                · {product.distanceKm < 1 ? "ใกล้กว่า 1 กม." : `${Math.round(product.distanceKm)} กม.`}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-primary-600 font-bold">{formatPrice(product.price)}</span>
            <button
              className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40"
              disabled={product.stock === 0}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
