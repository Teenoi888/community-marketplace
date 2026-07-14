"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Link from "next/link"
import { ArrowLeft, Package, Clock, Truck, CheckCircle, XCircle, ExternalLink } from "lucide-react"

const STATUS_STEPS = [
  { key: "pending_payment", label: "รอชำระเงิน" },
  { key: "paid",            label: "ชำระแล้ว" },
  { key: "preparing",       label: "เตรียมสินค้า" },
  { key: "shipped",         label: "จัดส่งแล้ว" },
  { key: "delivered",       label: "ส่งถึงแล้ว" },
]

const LOGISTICS_TRACK_URL: Record<string, string> = {
  "ไปรษณีย์ไทย":  "https://track.thailandpost.co.th/?barcode=",
  "Kerry Express": "https://th.kerryexpress.com/th/track/?track=",
  "Flash Express": "https://www.flashexpress.co.th/tracking/?se=",
  "J&T Express":   "https://www.jtexpress.co.th/trajectoryQuery?billCodes=",
  "DHL":           "https://www.dhl.com/th-th/home/tracking.html?tracking-id=",
  "Lazada Logistics": "https://track.lazada.co.th/tracking?trackingNo=",
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [trackingData, setTrackingData] = useState<any>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(r => {
        const o = r.data.data
        setOrder(o)
        // Auto-fetch tracking if tracking number exists
        if (o.trackingNumber) {
          setTrackingLoading(true)
          api.get(`/tracking/${o.trackingNumber}?carrier=${encodeURIComponent(o.logisticsProvider || "")}`)
            .then(tr => setTrackingData(tr.data.data))
            .catch(() => {})
            .finally(() => setTrackingLoading(false))
        }
      })
      .catch(() => router.push("/orders"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <main className="min-h-screen bg-gray-50"><MainNav />
      <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
    </main>
  )
  if (!order) return null

  const currentStep = STATUS_STEPS.findIndex(s => s.key === order.status)
  const isCancelled = order.status === "cancelled"

  const trackUrl = order.logisticsProvider && order.trackingNumber
    ? (LOGISTICS_TRACK_URL[order.logisticsProvider] || "") + order.trackingNumber
    : null

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">ออเดอร์ #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString("th-TH")}</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">สถานะออเดอร์</h2>
          {isCancelled ? (
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="w-6 h-6" />
              <span className="font-medium">ออเดอร์นี้ถูกยกเลิก</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                      ${i <= currentStep ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                      {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] text-center leading-tight ${i <= currentStep ? "text-primary-600 font-medium" : "text-gray-400"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 mb-4 transition-colors ${i < currentStep ? "bg-primary-400" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4" /> ข้อมูลการจัดส่ง
            </h2>
            <div className="space-y-2 mb-4">
              {order.logisticsProvider && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ขนส่ง</span>
                  <span className="font-medium">{order.logisticsProvider}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">เลขพัสดุ</span>
                <span className="font-mono font-bold text-gray-800">{order.trackingNumber}</span>
              </div>
              {trackingData?.statusText && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">สถานะล่าสุด</span>
                  <span className="font-medium text-primary-600">{trackingData.statusText}</span>
                </div>
              )}
              {trackUrl && (
                <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-3 btn-primary py-2.5 text-sm">
                  <ExternalLink className="w-4 h-4" /> ติดตามพัสดุ
                </a>
              )}
            </div>

            {/* Checkpoints */}
            {trackingLoading && <p className="text-xs text-gray-400 text-center py-2">กำลังโหลด tracking...</p>}
            {trackingData?.checkpoints?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">ประวัติการจัดส่ง</p>
                <div className="space-y-3">
                  {trackingData.checkpoints.map((cp: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${i === 0 ? "bg-primary-500" : "bg-gray-300"}`} />
                        {i < trackingData.checkpoints.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-medium text-gray-800">{cp.message}</p>
                        {cp.location && <p className="text-xs text-gray-400">{cp.location}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(cp.time).toLocaleString("th-TH")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">รายการสินค้า</h2>
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{item.productName}</p>
                    <p className="text-gray-400">x{item.qty}</p>
                  </div>
                </div>
                <span className="font-semibold">{fmt(Number(item.priceSnapshot) * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between font-bold">
            <span>รวมทั้งหมด</span>
            <span className="text-primary-600 text-lg">{fmt(Number(order.total))}</span>
          </div>
        </div>

        {/* Delivery Address */}
        {order.deliveryAddress && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-3">ที่อยู่จัดส่ง</h2>
            <div className="text-sm text-gray-600 space-y-0.5">
              <p className="font-medium text-gray-900">{order.deliveryAddress.name}</p>
              <p>{order.deliveryAddress.phone}</p>
              <p>{order.deliveryAddress.address}</p>
              <p>{order.deliveryAddress.subdistrict ? `${order.deliveryAddress.subdistrict}, ` : ""}{order.deliveryAddress.district}, {order.deliveryAddress.province} {order.deliveryAddress.zipCode}</p>
            </div>
          </div>
        )}

        {/* Payment action */}
        {order.status === "pending_payment" && (
          <Link href={`/checkout/${order.id}`} className="btn-primary w-full py-4 text-center text-base block">
            ชำระเงินเลย
          </Link>
        )}

        {/* Confirm received */}
        {order.status === "shipped" && (
          <ConfirmReceivedButton orderId={order.id} onConfirmed={() => setOrder({ ...order, status: "delivered" })} />
        )}
      </div>
    </main>
  )
}

function ConfirmReceivedButton({ orderId, onConfirmed }: { orderId: string; onConfirmed: () => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConfirm() {
    if (!window.confirm("ยืนยันว่าได้รับสินค้าครบถ้วนแล้ว?")) return
    setLoading(true)
    try {
      await api.patch(`/orders/${orderId}/status`, { status: "delivered" })
      setDone(true)
      onConfirmed()
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="flex items-center justify-center gap-2 py-4 text-green-600 font-semibold">
      <CheckCircle className="w-5 h-5" /> ยืนยันได้รับสินค้าแล้ว
    </div>
  )

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="w-full py-4 rounded-2xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
    >
      {loading ? "กำลังยืนยัน..." : "✅ ได้รับสินค้าแล้ว"}
    </button>
  )
}
