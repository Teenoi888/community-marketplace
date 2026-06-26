"use client"
import { Package, ShoppingBag, TrendingUp, MessageSquare, Plus } from "lucide-react"
import Link from "next/link"

const STATS = [
  { label: "ออเดอร์วันนี้", value: "0", icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
  { label: "สินค้าทั้งหมด", value: "0", icon: Package, color: "bg-green-50 text-green-600" },
  { label: "ยอดขายเดือนนี้", value: "฿0", icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
  { label: "แชทที่ยังไม่อ่าน", value: "0", icon: MessageSquare, color: "bg-orange-50 text-orange-600" },
]

export default function SellerDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">หน้าร้านของฉัน</h1>
            <p className="text-gray-500 text-sm mt-1">จัดการสินค้าและออเดอร์</p>
          </div>
          <Link href="/seller/products/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> เพิ่มสินค้า
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/seller/products" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">จัดการสินค้า</div>
              <div className="text-sm text-gray-500">เพิ่ม แก้ไข ลบสินค้า</div>
            </div>
          </Link>
          <Link href="/seller/orders" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">ออเดอร์</div>
              <div className="text-sm text-gray-500">ดูและจัดการออเดอร์</div>
            </div>
          </Link>
          <Link href="/seller/chat" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">แชทลูกค้า</div>
              <div className="text-sm text-gray-500">ตอบคำถามและนัดส่ง</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
