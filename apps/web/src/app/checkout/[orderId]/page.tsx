"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, Upload, RefreshCw, Clock } from "lucide-react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Image from "next/image"

type PaymentMethod = "promptpay" | "bank_transfer"
type PaymentStatus = "pending" | "verifying" | "verified"

interface OrderData {
  id: string
  total: string
  status: string
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function PaymentPage({ params }: { params: { orderId: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [method, setMethod] = useState<PaymentMethod>("promptpay")
  const [qrData, setQrData] = useState<{ qrImage?: string; promptpayId?: string } | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [payStatus, setPayStatus] = useState<PaymentStatus>("pending")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get(`/orders/${params.orderId}`)
      .then(r => setOrder(r.data.data))
      .catch(() => toast.error("ไม่พบออเดอร์"))
  }, [params.orderId])

  // Auto-poll payment status every 5s
  useEffect(() => {
    if (payStatus === "verified") return
    const interval = setInterval(async () => {
      try {
        const r = await api.get(`/orders/${params.orderId}`)
        if (r.data.data.status === "paid") {
          setPayStatus("verified")
          clearInterval(interval)
        }
      } catch {}
    }, 5_000)
    return () => clearInterval(interval)
  }, [params.orderId, payStatus])

  // Generate PromptPay QR
  async function generateQR() {
    if (!order) return
    setLoading(true)
    try {
      const r = await api.post("/payments/promptpay-qr", {
        amount: Number(order.total),
        orderId: order.id,
      })
      setQrData(r.data.data)
    } catch {
      toast.error("ไม่สามารถสร้าง QR ได้")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (order && method === "promptpay") generateQR()
  }, [order, method])

  function handleSlipSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    setSlipPreview(URL.createObjectURL(file))
  }

  async function submitSlip() {
    if (!slipFile || !order) return
    setLoading(true)
    setPayStatus("verifying")
    try {
      // Upload slip image
      const formData = new FormData()
      formData.append("file", slipFile)
      formData.append("folder", "slips")
      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const slipUrl = uploadRes.data.data.url

      // Submit payment
      await api.post("/payments", {
        orderId: order.id,
        method: "bank_transfer",
        slipUrl,
      })
      toast.success("อัปโหลดสลิปสำเร็จ กำลังตรวจสอบ...")
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่")
      setPayStatus("pending")
    } finally {
      setLoading(false)
    }
  }

  if (payStatus === "verified") {
    return (
      <main>
        <MainNav />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ชำระเงินสำเร็จ! 🎉</h1>
          <p className="text-gray-500 mb-6">ผู้ขายได้รับออเดอร์ของคุณแล้ว กำลังเตรียมสินค้า</p>
          <button onClick={() => router.push("/orders")} className="btn-primary w-full py-3">
            ดูสถานะออเดอร์
          </button>
        </div>
      </main>
    )
  }

  return (
    <main>
      <MainNav />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">💳 ชำระเงิน</h1>
        {order && (
          <p className="text-gray-500 mb-6">ออเดอร์ #{order.id.slice(0,8).toUpperCase()} — {formatPrice(Number(order.total))}</p>
        )}

        {/* Method tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: "promptpay", label: "📱 PromptPay / QR" },
            { id: "bank_transfer", label: "🏦 โอนธนาคาร" },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`flex-1 py-3 rounded-xl font-medium text-sm border-2 transition-colors ${
                method === id
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* PromptPay QR */}
        {method === "promptpay" && (
          <div className="card text-center space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
                <p className="text-gray-400">กำลังสร้าง QR Code...</p>
              </div>
            ) : qrData?.qrImage ? (
              <>
                <p className="font-semibold text-gray-800">สแกน QR Code เพื่อชำระเงิน</p>
                <div className="bg-white border-4 border-primary-600 rounded-2xl p-2 inline-block">
                  <Image src={qrData.qrImage} alt="PromptPay QR" width={220} height={220} />
                </div>
                <div className="bg-primary-50 rounded-xl px-4 py-3">
                  <p className="text-3xl font-extrabold text-primary-700">{order ? formatPrice(Number(order.total)) : ""}</p>
                  <p className="text-sm text-gray-500 mt-1">ยอดที่ต้องชำระ</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
                  <Clock className="w-4 h-4 animate-pulse text-primary-500" />
                  กำลังรอการชำระเงิน...
                </div>
              </>
            ) : qrData?.promptpayId ? (
              <div className="py-8">
                <p className="font-semibold text-gray-800 mb-2">โอน PromptPay มายัง</p>
                <p className="text-2xl font-bold text-primary-600">{qrData.promptpayId}</p>
                <p className="text-3xl font-extrabold mt-4 text-gray-900">{order ? formatPrice(Number(order.total)) : ""}</p>
                <p className="text-sm text-gray-400 mt-2">จากนั้นอัปโหลดสลิปด้านล่าง</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Bank Transfer + Slip Upload */}
        {(method === "bank_transfer" || (method === "promptpay" && qrData?.promptpayId)) && (
          <div className="card mt-4 space-y-4">
            <h3 className="font-semibold text-gray-800">อัปโหลดสลิปการโอนเงิน</h3>

            <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              slipPreview ? "border-primary-400 bg-primary-50" : "border-gray-300 hover:border-primary-400"
            }`}>
              {slipPreview ? (
                <Image src={slipPreview} alt="Slip" width={200} height={300} className="mx-auto rounded-lg object-contain max-h-64" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">คลิกเพื่อเลือกรูปสลิป</p>
                  <p className="text-gray-400 text-sm mt-1">PNG, JPG ขนาดไม่เกิน 5MB</p>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleSlipSelect} className="hidden" />
            </label>

            {slipFile && (
              <button
                onClick={submitSlip}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading
                  ? payStatus === "verifying" ? "⏳ กำลังตรวจสอบสลิป..." : "กำลังอัปโหลด..."
                  : "ยืนยันการชำระเงิน"
                }
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
