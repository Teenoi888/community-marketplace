"use client"
import { MainNav } from "@/components/layout/MainNav"
import { useCartStore } from "@/lib/store/cart"
import Image from "next/image"
import Link from "next/link"
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react"

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCartStore()

  if (items.length === 0) {
    return (
      <main>
        <MainNav />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <ShoppingCart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">ตะกร้าของคุณว่างเปล่า</h2>
          <p className="text-gray-400 mb-6">เลือกสินค้าจากชุมชนใกล้บ้านคุณ</p>
          <Link href="/" className="btn-primary">เลือกซื้อสินค้า</Link>
        </div>
      </main>
    )
  }

  // Group by shop
  const byShop = items.reduce((acc, item) => {
    if (!acc[item.shopId]) acc[item.shopId] = { shopName: item.shopName, items: [] }
    acc[item.shopId].items.push(item)
    return acc
  }, {} as Record<string, { shopName: string; items: typeof items }>)

  return (
    <main>
      <MainNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🛒 ตะกร้าสินค้า</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {Object.entries(byShop).map(([shopId, group]) => (
              <div key={shopId} className="card">
                <div className="text-sm font-semibold text-primary-600 mb-3 pb-2 border-b border-gray-100">
                  🏪 {group.shopName}
                </div>
                <div className="space-y-4">
                  {group.items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {product.images[0]
                          ? <Image src={product.images[0]} alt={product.name} width={64} height={64} className="object-cover" />
                          : <span className="text-2xl">🛒</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                        <p className="text-primary-600 font-bold mt-0.5">{formatPrice(product.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={quantity >= product.stock}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-20 text-right">
                        <p className="font-semibold text-sm">{formatPrice(product.price * quantity)}</p>
                      </div>
                      <button onClick={() => removeItem(product.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20">
              <h3 className="font-bold text-gray-900 mb-4">สรุปออเดอร์</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>รวมสินค้า ({items.reduce((s,i)=>s+i.quantity,0)} ชิ้น)</span>
                  <span>{formatPrice(total())}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>ค่าจัดส่ง</span>
                  <span className="text-green-600">ฟรี (ชำระปลายทาง)</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                  <span>รวมทั้งหมด</span>
                  <span className="text-primary-600 text-lg">{formatPrice(total())}</span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="btn-primary w-full text-center block py-3 text-base"
              >
                ดำเนินการสั่งซื้อ
              </Link>
              <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-500 w-full text-center mt-3 transition-colors">
                ล้างตะกร้า
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
