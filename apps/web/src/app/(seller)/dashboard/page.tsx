"use client"
import { useEffect, useState } from "react"
import { Package, ShoppingBag, TrendingUp, MessageSquare, Plus, AlertTriangle, Clock, RefreshCw, ChevronLeft, Settings, BarChart2, Star } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

interface ShopStats {
  todayOrders: number
  pendingOrders: number
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  monthRevenue: number
  shopName: string
  shopId: string
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<ShopStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [shopRating, setShopRating] = useState<{ avgRating: number; totalReviews: number } | null>(null)

  async function fetchStats() {
    setLoading(true)
    try {
      const r = await api.get("/orders/shop/stats")
      const s = r.data.data
      setStats(s)
      setLastUpdated(new Date())
      // Fetch shop rating using the shopId from stats
      if (s?.shopId) {
        api.get(`/shops/${s.shopId}/rating`)
          .then(rr => setShopRating(rr.data.data))
          .catch(() => {})
      }
    } catch {
      // user has no shop yet → stats stay null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const statCards = stats
    ? [
        {
          label: "ออเดอร์วันนี้",
          value: stats.todayOrders.toString(),
          icon: ShoppingBag,
          color: "bg-blue-50 text-blue-600",
          sub: stats.pendingOrders > 0 ? `${stats.pendingOrders} รอดำเนินการ` : "ไม่มีรอดำเนินการ",
          subColor: stats.pendingOrders > 0 ? "text-orange-500" : "text-gray-400",
          href: "/seller/orders",
        },
        {
          label: "สินค้าทั้งหมด",
          value: stats.totalProducts.toString(),
          icon: Package,
          color: "bg-green-50 text-green-600",
          sub: stats.outOfStockProducts > 0
            ? `${stats.outOfStockProducts} หมดสต็อก`
            : stats.lowStockProducts > 0
              ? `${stats.lowStockProducts} ใกล้หมด`
              : "สต็อกปกติ",
          subColor: stats.outOfStockProducts > 0 ? "text-red-500" : stats.lowStockProducts > 0 ? "text-orange-400" : "text-gray-400",
          href: "/products",
        },
        {
          label: "ยอดขายเดือนนี้",
          value: fmt(stats.monthRevenue),
          icon: TrendingUp,
          color: "bg-purple-50 text-purple-600",
          sub: "เฉพาะออเดอร์ที่ชำระแล้ว",
          subColor: "text-gray-400",
          href: "/seller/orders",
        },
        {
          label: "แชทที่ยังไม่อ่าน",
          value: "0",
          icon: MessageSquare,
          color: "bg-orange-50 text-orange-600",
          sub: "ไม่มีข้อความใหม่",
          subColor: "text-gray-400",
          href: "/chat",
        },
      ]
    : [
        { label: "ออเดอร์วันนี้",    value: "—", icon: ShoppingBag, color: "bg-blue-50 text-blue-600",   sub: "", subColor: "", href: "/seller/orders" },
        { label: "สินค้าทั้งหมด",    value: "—", icon: Package,     color: "bg-green-50 text-green-600",  sub: "", subColor: "", href: "/products" },
        { label: "ยอดขายเดือนนี้",  value: "—", icon: TrendingUp,  color: "bg-purple-50 text-purple-600", sub: "", subColor: "", href: "/seller/orders" },
        { label: "แชทที่ยังไม่อ่าน", value: "—", icon: MessageSquare, color: "bg-orange-50 text-orange-600", sub: "", subColor: "", href: "/chat" },
      ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2 transition-colors">
              <ChevronLeft className="w-4 h-4" /> กลับหน้าแรก
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">หน้าร้านของฉัน</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">{stats?.shopName ?? "จัดการสินค้าและออเดอร์"}</p>
              {lastUpdated && (
                <span className="text-xs text-gray-400">· อัปเดต {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="รีเฟรช"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/settings" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="ตั้งค่าร้าน">
              <Settings className="w-4 h-4" />
            </Link>
            <Link href="/products/new" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> เพิ่มสินค้า
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color, sub, subColor, href }) => (
            <Link key={label} href={href} className="card hover:shadow-md transition-shadow cursor-pointer group">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                {loading ? <RefreshCw className="w-5 h-5 animate-spin opacity-40" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className={`text-2xl font-bold text-gray-900 ${loading ? "opacity-30" : ""}`}>
                {loading ? "…" : value}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">{label}</div>
              {sub && !loading && (
                <div className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</div>
              )}
            </Link>
          ))}
        </div>

        {/* Alerts */}
        {!loading && stats && (
          <>
            {stats.outOfStockProducts > 0 && (
              <div className="flex items-center gap-3 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>มีสินค้า <strong>{stats.outOfStockProducts} รายการ</strong> หมดสต็อกแล้ว — <Link href="/products" className="underline font-semibold">จัดการสต็อก</Link></span>
              </div>
            )}
            {stats.pendingOrders > 0 && (
              <div className="flex items-center gap-3 p-3 mb-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>มีออเดอร์ <strong>{stats.pendingOrders} รายการ</strong> รอดำเนินการ — <Link href="/seller/orders" className="underline font-semibold">ดูออเดอร์</Link></span>
              </div>
            )}
          </>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link href="/products" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">จัดการสินค้า</div>
              <div className="text-sm text-gray-500">
                {stats ? `${stats.activeProducts} รายการ active` : "เพิ่ม แก้ไข ลบสินค้า"}
              </div>
            </div>
          </Link>

          <Link href="/seller/orders" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">ออเดอร์ร้านฉัน</div>
              <div className="text-sm text-gray-500">
                {stats?.pendingOrders ? (
                  <span className="text-orange-500 font-medium">{stats.pendingOrders} รอดำเนินการ</span>
                ) : "รับออเดอร์ + ใส่ tracking"}
              </div>
            </div>
          </Link>

          <Link href="/chat" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">แชทลูกค้า</div>
              <div className="text-sm text-gray-500">ตอบคำถามและนัดส่ง</div>
            </div>
          </Link>

          <Link href="/dashboard/analytics" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Analytics</div>
              <div className="text-sm text-gray-500">ยอดขาย + สินค้าขายดี</div>
            </div>
          </Link>

          <Link href="/inventory" className="card hover:shadow-md transition-shadow flex items-center gap-4 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              (stats?.outOfStockProducts ?? 0) > 0 ? "bg-red-100 text-red-600 group-hover:bg-red-200" :
              (stats?.lowStockProducts ?? 0) > 0 ? "bg-amber-100 text-amber-600 group-hover:bg-amber-200" :
              "bg-teal-100 text-teal-600 group-hover:bg-teal-200"
            }`}>
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">สต็อก</div>
              <div className="text-sm">
                {(stats?.outOfStockProducts ?? 0) > 0
                  ? <span className="text-red-500 font-medium">{stats!.outOfStockProducts} หมด!</span>
                  : (stats?.lowStockProducts ?? 0) > 0
                    ? <span className="text-amber-500">{stats!.lowStockProducts} เหลือน้อย</span>
                    : <span className="text-gray-500">จัดการสต็อก</span>
                }
              </div>
            </div>
          </Link>

          {/* Shop Rating card */}
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-500 flex-shrink-0">
              <Star className="w-6 h-6 fill-yellow-400" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">คะแนนร้าน</div>
              {shopRating && shopRating.totalReviews > 0 ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xl font-bold text-yellow-500">{shopRating.avgRating.toFixed(1)}</span>
                  <span className="text-xs text-gray-400">/ 5 · {shopRating.totalReviews} รีวิว</span>
                </div>
              ) : (
                <div className="text-sm text-gray-400">ยังไม่มีรีวิว</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
