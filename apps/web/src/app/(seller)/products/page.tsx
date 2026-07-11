"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Package, ArrowLeft } from "lucide-react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images?: string[]
  category: string
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/products?seller=me")
      .then((r) => setProducts(r.data.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">สินค้าของฉัน</h1>
              <p className="text-sm text-gray-500">{products.length} รายการ</p>
            </div>
          </div>
          <Link href="/products/new" className="btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> เพิ่มสินค้า
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">ยังไม่มีสินค้า</p>
            <Link href="/products/new" className="btn-primary px-6 py-2">
              เพิ่มสินค้าแรก
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((p) => (
              <Link key={p.id} href={`/products/${p.id}/edit`} className="card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    : <Package className="w-8 h-8 text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                  <div className="text-primary-600 font-bold">฿{p.price.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">คงเหลือ {p.stock} ชิ้น</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
