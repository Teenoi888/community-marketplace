"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Package, ArrowLeft, ChevronDown, Store } from "lucide-react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"

interface Shop {
  id: string
  name: string
  community?: { name: string; slug: string }
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images?: string[]
  category: string
  shop?: Shop
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [showShopPicker, setShowShopPicker] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get("/products?seller=me"),
      api.get("/auth/me/shops"),
    ])
      .then(([pRes, sRes]) => {
        setProducts(pRes.data.data || [])
        setShops(sRes.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group products by shop
  const byShop = products.reduce<Record<string, { shop: Shop; items: Product[] }>>((acc, p) => {
    const shopId = p.shop?.id ?? "unknown"
    if (!acc[shopId]) acc[shopId] = { shop: p.shop!, items: [] }
    acc[shopId].items.push(p)
    return acc
  }, {})

  const hasMultipleShops = shops.length > 1

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">สินค้าของฉัน</h1>
              <p className="text-sm text-gray-500">{products.length} รายการ · {shops.length} ร้าน</p>
            </div>
          </div>

          {/* Add product — ถ้ามีหลาย shop ให้เลือก */}
          {hasMultipleShops ? (
            <div className="relative">
              <button
                onClick={() => setShowShopPicker(!showShopPicker)}
                className="btn-primary flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-4 h-4" /> เพิ่มสินค้า <ChevronDown className="w-3 h-3" />
              </button>
              {showShopPicker && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 min-w-48">
                  <p className="text-xs text-gray-400 px-4 py-1.5 font-medium">เลือกร้านที่จะเพิ่มสินค้า</p>
                  {shops.map(shop => (
                    <Link
                      key={shop.id}
                      href={`/products/new?shopId=${shop.id}`}
                      onClick={() => setShowShopPicker(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <Store className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{shop.name}</p>
                        {shop.community && (
                          <p className="text-xs text-gray-400">{shop.community.name}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              href={shops[0] ? `/products/new?shopId=${shops[0].id}` : "/products/new"}
              className="btn-primary flex items-center gap-2 px-4 py-2"
            >
              <Plus className="w-4 h-4" /> เพิ่มสินค้า
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">ยังไม่มีสินค้า</p>
            <Link href="/products/new" className="btn-primary px-6 py-2">เพิ่มสินค้าแรก</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(byShop).map(({ shop, items }) => (
              <div key={shop?.id}>
                {/* Shop header */}
                {hasMultipleShops && shop && (
                  <div className="flex items-center gap-2 mb-3">
                    <Store className="w-4 h-4 text-primary-500" />
                    <span className="font-semibold text-gray-700 text-sm">{shop.name}</span>
                    {shop.community && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {shop.community.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{items.length} รายการ</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}/edit`}
                      className="card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          : <Package className="w-8 h-8 text-gray-300" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                        <div className="text-primary-600 font-bold">฿{Number(p.price).toLocaleString()}</div>
                        <div className="text-sm text-gray-400">คงเหลือ {p.stock} ชิ้น</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
