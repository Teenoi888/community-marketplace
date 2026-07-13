"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Link from "next/link"
import { ArrowLeft, Package, Truck, ChevronDown, ChevronUp, CheckCircle, ExternalLink } from "lucide-react"
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

// ลิงก์จองพัสดุแต่ละบริษัท
const LOGISTICS_BOOKING: Record<string, { url: string; label: string }> = {
  "ไปรษณีย์ไทย":  { url: "https://www.postontop.th/", label: "จองที่ไปรษณีย์ไทย" },
  "Kerry Express": { url: "https://th.kerryexpress.com/th/sender/", label: "จองที่ Kerry" },
  "Flash Express": { url: "https://app.flashexpress.com/", label: "จองที่ Flash" },
  "J&T Express":  { url: "https://www.jtexpress.th/", label: "จองที่ J&T" },
  "DHL":           { url: "https://mydhl.express.dhl/th/th/home.html", label: "จองที่ DHL" },
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tracking, setTracking] = useState<Record<string, { number: string; provider: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [cancelModal, setCancelModal] = useState<{ orderId: string } | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  useEffect(() => {
    api.get("/orders/shop")
      .then(r => setOrders(r.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  async function updateStatus(orderId: string, status: string, reason?: string) {
    try {
      const r = await api.patch(`/orders/${orderId}/status`, {
        status,
        ...(reason ? { cancelReason: reason } : {}),
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...r.data.data } : o))
      toast.success("อัปเดตสถานะแล้ว")
    } catch { toast.error("เกิดข้อผิดพลาด") }
  }

  async function confirmCancel() {
    if (!cancelModal) return
    if (!cancelReason.trim()) return toast.error("กรุณาระบุเหตุผลที่ยกเลิก")
    await updateStatus(cancelModal.orderId, "cancelled", cancelReason.trim())
    setCancelModal(null)
    setCancelReason("")
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
      // API auto-sets status → "shipped" — update local state immediately
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, ...r.data.data, status: "shipped" }
          : o
      ))
      toast.success("✅ บันทึก tracking แล้ว! สถานะเปลี่ยนเป็น จัดส่งแล้ว")
    } catch { toast.error("เกิดข้อผิดพลาด") } finally { setSaving(null) }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-3xl mx-auto px-4 py-8">
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
                            {order.deliveryAddress.address}, {order.deliveryAddress.district}, {order.deliveryAddress.province} {order.deliveryAddress.zipCode}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">อัปเดตสถานะ</p>
                        <div className="flex flex-wrap gap-2">
                          {["paid", "shipped", "delivered"].map(st => (
                            <button key={st} onClick={() => updateStatus(order.id, st)}
                              disabled={order.status === st}
                              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors
                                ${order.status === st
                                  ? "bg-primary-600 text-white border-primary-600"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-400"}`}>
                              {STATUS_MAP[st]?.label}
                            </button>
                          ))}
                          {order.status !== "cancelled" && (
                            <button
                              onClick={() => { setCancelReason(""); setCancelModal({ orderId: order.id }) }}
                              className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors bg-white text-red-500 border-red-200 hover:bg-red-50"
                            >
                              ยกเลิก
                            </button>
                          )}
                          {order.status === "cancelled" && (
                            <span className="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-600 font-medium">
                              ยกเลิกแล้ว
                              {order.cancelReason && ` — ${order.cancelReason}`}
                            </span>
                          )}
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
                        <div className="flex gap-2 mb-2">
                          <select value={t.provider}
                            onChange={e => setTracking(prev => ({ ...prev, [order.id]: { ...t, provider: e.target.value } }))}
                            className="input text-sm py-2 w-40 flex-shrink-0">
                            {LOGISTICS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <input value={t.number} placeholder="เลขพัสดุ (กรอกหลังจองกับขนส่งแล้ว)"
                            onChange={e => setTracking(prev => ({ ...prev, [order.id]: { ...t, number: e.target.value } }))}
                            className="input text-sm py-2 flex-1" />
                          <button onClick={() => saveTracking(order.id)}
                            disabled={saving === order.id}
                            className="btn-primary text-sm px-4 py-2 flex-shrink-0">
                            {saving === order.id ? "..." : "บันทึก"}
                          </button>
                        </div>
                        {/* ลิงก์จองพัสดุ */}
                        {LOGISTICS_BOOKING[t.provider] && (
                          <a
                            href={LOGISTICS_BOOKING[t.provider].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {LOGISTICS_BOOKING[t.provider].label} (รับเลขพัสดุจากที่นี่)
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cancel reason modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">ยืนยันการยกเลิก</h3>
            <p className="text-sm text-gray-500 mb-4">กรุณาระบุเหตุผล เพื่อแจ้งให้ผู้ซื้อทราบ</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="เช่น สินค้าหมด, ที่อยู่จัดส่งไม่ถูกต้อง..."
              rows={3}
              className="input w-full text-sm resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
