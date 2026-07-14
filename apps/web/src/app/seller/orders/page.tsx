"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Link from "next/link"
import { ArrowLeft, Package, Truck, ChevronDown, ChevronUp, CheckCircle } from "lucide-react"
import { toast } from "sonner"

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "รอชำระ",      color: "text-yellow-600 bg-yellow-50" },
  paid:            { label: "ชำระแล้ว",    color: "text-blue-600 bg-blue-50" },
  preparing:       { label: "เตรียมสินค้า", color: "text-indigo-600 bg-indigo-50" },
  shipped:         { label: "จัดส่งแล้ว",  color: "text-primary-600 bg-primary-50" },
  delivered:       { label: "ส่งถึงแล้ว",  color: "text-green-600 bg-green-50" },
  cancelled:       { label: "ยกเลิก",      color: "text-red-600 bg-red-50" },
}

const LOGISTICS = ["ไปรษณีย์ไทย", "Kerry Express", "Flash Express", "J&T Express", "DHL", "อื่นๆ"]

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tracking, setTracking] = useState<Record<string, { number: string; provider: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    api.get("/orders/shop")
      .then(r => setOrders(r.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  async function updateStatus(orderId: string, status: string) {
    try {
      const r = await api.patch(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: r.data.data.status } : o))
      toast.success("อัปเดตสถานะแล้ว")
    } catch { toast.error("เกิดข้อผิดพลาด") }
  }

  async function saveTracking(orderId: string) {
    const t = tracking[orderId]
    if (!t?.number || !t?.provider) return toast.error("กรุณากรอกข้อมูลให้ครบ")
    setSaving(orderId)
    try {
      const r = await api.patch(`/orders/${orderId}/tracking`, {
        trackingNumber: t.number,
        logisticsProvider: t.provider,
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...r.data.data } : o))
      toast.success("บันทึก tracking แล้ว!")
    } catch { toast.error("เกิดข้อผิดพลาด") } finally { setSaving(null) }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-bold text-gray-900">ออเดอร์ร้านฉัน</h1>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">ยังไม่มีออเดอร์</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const s = STATUS_MAP[order.status] || STATUS_MAP.pending_payment
              const isOpen = expanded === order.id
              const t = tracking[order.id] || { number: order.trackingNumber || "", provider: order.logisticsProvider || LOGISTICS[0] }

              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setExpanded(isOpen ? null : order.id)}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {order.buyer?.name || "ลูกค้า"} · {fmt(Number(order.total))}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">รายการ</p>
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm py-1">
                            <span className="text-gray-700">{item.productName} x{item.qty}</span>
                            <span className="font-medium">{fmt(Number(item.priceSnapshot) * item.qty)}</span>
                          </div>
                        ))}
                      </div>

                      {order.deliveryAddress && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">ที่อยู่จัดส่ง</p>
                          <p className="text-sm text-gray-600">
                            {order.deliveryAddress.name} · {order.deliveryAddress.phone}<br />
                            {order.deliveryAddress.address}, {order.deliveryAddress.subdistrict ? `${order.deliveryAddress.subdistrict}, ` : ""}{order.deliveryAddress.district}, {order.deliveryAddress.province} {order.deliveryAddress.zipCode}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">อัปเดตสถานะ</p>
                        <div className="flex flex-wrap gap-2">
                          {["paid", "preparing", "shipped", "delivered", "cancelled"].map(st => (
                            <button key={st} onClick={() => updateStatus(order.id, st)}
                              disabled={order.status === st}
                              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors
                                ${order.status === st
                                  ? "bg-primary-600 text-white border-primary-600"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-400"}`}>
                              {STATUS_MAP[st]?.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> กรอก Tracking Number
                        </p>
                        {order.trackingNumber && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mb-2">
                            <CheckCircle className="w-3 h-3" /> {order.logisticsProvider}: {order.trackingNumber}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <div className="relative w-40 flex-shrink-0">
                            <select value={t.provider}
                              onChange={e => setTracking(prev => ({ ...prev, [order.id]: { ...t, provider: e.target.value } }))}
                              className="input text-sm py-2 appearance-none pr-9 w-full">
                              {LOGISTICS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <input value={t.number} placeholder="เลขพัสดุ"
                            onChange={e => setTracking(prev => ({ ...prev, [order.id]: { ...t, number: e.target.value } }))}
                            className="input text-sm py-2 flex-1" />
                          <button onClick={() => saveTracking(order.id)}
                            disabled={saving === order.id}
                            className="btn-primary text-sm px-4 py-2 flex-shrink-0">
                            {saving === order.id ? "..." : "บันทึก"}
                          </button>
                        </div>
                      </div>
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
