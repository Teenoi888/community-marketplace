"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Link from "next/link"
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronRight, ExternalLink } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending_payment: { label: "รอชำระเงิน", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: Clock },
  paid:            { label: "ชำระแล้ว",    color: "text-blue-600 bg-blue-50 border-blue-200",   icon: CheckCircle },
  preparing:       { label: "เตรียมสินค้า", color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: Package },
  shipped:         { label: "จัดส่งแล้ว",  color: "text-primary-600 bg-primary-50 border-primary-200", icon: Truck },
  delivered:       { label: "ส่งถึงแล้ว",  color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  cancelled:       { label: "ยกเลิก",      color: "text-red-600 bg-red-50 border-red-200",      icon: XCircle },
}

const LOGISTICS_TRACK_URL: Record<string, string> = {
  "ไปรษณีย์ไทย":    "https://track.thailandpost.co.th/?barcode=",
  "Kerry Express":   "https://th.kerryexpress.com/th/track/?track=",
  "Flash Express":   "https://www.flashexpress.co.th/tracking/?se=",
  "J&T Express":     "https://www.jtexpress.co.th/trajectoryQuery?billCodes=",
  "DHL":             "https://www.dhl.com/th-th/home/tracking.html?tracking-id=",
  "Lazada Logistics":"https://track.lazada.co.th/tracking?trackingNo=",
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days} วันที่แล้ว`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours} ชั่วโมงที่แล้ว`
  const mins = Math.floor(diff / 60000)
  return `${mins} นาทีที่แล้ว`
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/orders")
      .then(r => setOrders(r.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">คำสั่งซื้อของฉัน</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-24" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">ยังไม่มีคำสั่งซื้อ</p>
            <Link href="/" className="btn-primary px-6 py-2">เลือกซื้อสินค้า</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const s = STATUS_MAP[order.status] || STATUS_MAP.pending_payment
              const Icon = s.icon
              const hasTracking = !!order.trackingNumber
              const trackUrl = hasTracking && order.logisticsProvider
                ? (LOGISTICS_TRACK_URL[order.logisticsProvider] || "") + order.trackingNumber
                : null

              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Main row — click to detail */}
                  <Link href={`/orders/${order.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.color} flex items-center gap-1`}>
                        <Icon className="w-3 h-3" /> {s.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{order.items?.length || 0} รายการ • {timeAgo(order.createdAt)}</p>
                        <p className="text-lg font-bold text-primary-600 mt-0.5">{fmt(Number(order.total))}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>

                  {/* Tracking bar — only when has tracking number */}
                  {hasTracking && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-primary-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Truck className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-primary-700 font-medium truncate">{order.logisticsProvider}</p>
                          <p className="text-xs font-mono text-primary-800 font-bold">{order.trackingNumber}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link href={`/orders/${order.id}`}
                          className="text-xs bg-white border border-primary-200 text-primary-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors">
                          ดูสถานะ
                        </Link>
                        {trackUrl && (
                          <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-primary-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> ติดตาม
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment CTA for pending */}
                  {order.status === "pending_payment" && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-yellow-50">
                      <Link href={`/checkout/${order.id}`}
                        className="block text-center text-xs font-bold text-yellow-700 hover:text-yellow-800">
                        ⚡ ชำระเงินเพื่อดำเนินการต่อ →
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
