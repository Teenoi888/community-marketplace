"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, Upload, RefreshCw, Clock, CreditCard, Lock, AlertCircle, FlaskConical } from "lucide-react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Image from "next/image"

type PaymentMethod = "promptpay" | "bank_transfer" | "credit_card"
type PaymentStatus = "pending" | "verifying" | "verified"

interface OrderData { id: string; total: string; status: string }
interface GatewayInfo {
  configured: boolean
  cardGateway: string | null
  publicKeys: { omise: string | null; gbprimepay: string | null }
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

// Format card number with spaces every 4 digits
function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4)
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d
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
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null)

  // Card form state
  const [demoLoading, setDemoLoading] = useState(false)

  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [cardName, setCardName] = useState("")

  useEffect(() => {
    api.get(`/orders/${params.orderId}`)
      .then(r => setOrder(r.data.data))
      .catch(() => toast.error("ไม่พบออเดอร์"))
    // Fetch gateway config
    api.get("/payments/gateway-info")
      .then(r => setGatewayInfo(r.data.data))
      .catch(() => {})
  }, [params.orderId])

  // Poll payment status
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

  async function generateQR() {
    if (!order) return
    setLoading(true)
    try {
      const r = await api.post("/payments/promptpay-qr", { amount: Number(order.total), orderId: order.id })
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
      const formData = new FormData()
      formData.append("file", slipFile)
      formData.append("folder", "slips")
      const uploadRes = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
      await api.post("/payments", { orderId: order.id, method: "bank_transfer", slipUrl: uploadRes.data.data.url })
      toast.success("อัปโหลดสลิปสำเร็จ กำลังตรวจสอบ...")
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่")
      setPayStatus("pending")
    } finally {
      setLoading(false)
    }
  }

  async function submitCard() {
    if (!order || !gatewayInfo?.configured) return
    setLoading(true)
    try {
      // Omise: tokenize on frontend using Omise.js, then send token to our API
      if (gatewayInfo.cardGateway === "omise" && gatewayInfo.publicKeys.omise) {
        // Load Omise.js dynamically
        await loadScript("https://cdn.omise.co/omise.js")
        const OmiseCard = (window as any).OmiseCard
        OmiseCard.configure({ publicKey: gatewayInfo.publicKeys.omise })
        const [mm, yy] = cardExpiry.split("/")
        const token: string = await new Promise((resolve, reject) =>
          OmiseCard.createToken("card", {
            name: cardName,
            number: cardNumber.replace(/\s/g, ""),
            expiration_month: mm?.trim(),
            expiration_year: `20${yy?.trim()}`,
            security_code: cardCvv,
          }, (statusCode: number, response: any) => {
            if (statusCode === 200) resolve(response.id)
            else reject(new Error(response.message))
          })
        )
        const res = await api.post("/payments/card-session", { orderId: order.id, omiseToken: token })
        if (res.data.data?.redirectUrl) {
          window.location.href = res.data.data.redirectUrl // 3DS
        } else if (res.data.data?.verified) {
          setPayStatus("verified")
        }
        return
      }

      // 2C2P / GB Prime Pay: redirect to hosted payment page
      const res = await api.post("/payments/card-session", { orderId: order.id })
      if (res.data.data?.redirectUrl) {
        window.location.href = res.data.data.redirectUrl
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  async function submitDemo() {
    if (!order) return
    setDemoLoading(true)
    try {
      await api.post("/payments/demo", { orderId: order.id })
      setPayStatus("verified")
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setDemoLoading(false)
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
          <p className="text-gray-500 mb-6">ออเดอร์ #{order.id.slice(0, 8).toUpperCase()} — {formatPrice(Number(order.total))}</p>
        )}

        {/* ── Demo Payment Banner ──────────────────────────────────── */}
        <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-800">โหมดทดสอบ (Demo)</span>
          </div>
          <p className="text-xs text-violet-600 mb-3">กดปุ่มด้านล่างเพื่อจำลองการชำระเงินสำเร็จ โดยไม่ต้องใช้บัตรหรือโอนเงินจริง</p>
          <button
            onClick={submitDemo}
            disabled={demoLoading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <FlaskConical className="w-4 h-4" />
            {demoLoading ? "กำลังดำเนินการ..." : `จำลองชำระเงิน ${order ? formatPrice(Number(order.total)) : ""}`}
          </button>
        </div>

        {/* Method tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {([
            { id: "promptpay",    label: "📱 PromptPay / QR" },
            { id: "bank_transfer",label: "🏦 โอนธนาคาร" },
            { id: "credit_card",  label: "💳 บัตรเครดิต" },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`py-3 px-2 rounded-xl font-medium text-xs sm:text-sm border-2 transition-colors ${
                method === id
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── PromptPay QR ─────────────────────────────────────────── */}
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

        {/* ── Slip Upload (bank transfer or promptpay manual) ───────── */}
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
              <button onClick={submitSlip} disabled={loading} className="btn-primary w-full py-3">
                {loading
                  ? (payStatus === "verifying" ? "⏳ กำลังตรวจสอบสลิป..." : "กำลังอัปโหลด...")
                  : "ยืนยันการชำระเงิน"
                }
              </button>
            )}
          </div>
        )}

        {/* ── Credit Card ──────────────────────────────────────────── */}
        {method === "credit_card" && (
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">บัตรเครดิต / เดบิต</h3>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5" /> SSL Secured
              </div>
            </div>

            {/* Card brand icons */}
            <div className="flex gap-2">
              {["VISA", "MC", "JCB", "AMEX"].map(b => (
                <div key={b} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-500 font-bold">{b}</div>
              ))}
            </div>

            {/* Gateway not configured notice */}
            {gatewayInfo && !gatewayInfo.configured && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payment Gateway ยังไม่ได้เชื่อมต่อ</p>
                  <p className="text-xs mt-0.5 text-amber-600">ใส่ key ใน Railway env vars: <code>OMISE_SECRET_KEY</code>, <code>OMISE_PUBLIC_KEY</code> เพื่อเปิดใช้งาน</p>
                </div>
              </div>
            )}

            {/* Card form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเลขบัตร</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    className="input pl-9 font-mono tracking-widest"
                    maxLength={19}
                    disabled={!gatewayInfo?.configured}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันหมดอายุ</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                    className="input font-mono tracking-widest"
                    maxLength={5}
                    disabled={!gatewayInfo?.configured}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="•••"
                    value={cardCvv}
                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="input font-mono"
                    maxLength={4}
                    disabled={!gatewayInfo?.configured}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อบนบัตร</label>
                <input
                  type="text"
                  placeholder="SOMCHAI JAIDEE"
                  value={cardName}
                  onChange={e => setCardName(e.target.value.toUpperCase())}
                  className="input uppercase tracking-wider"
                  disabled={!gatewayInfo?.configured}
                />
              </div>
            </div>

            <button
              onClick={submitCard}
              disabled={loading || !gatewayInfo?.configured || !cardNumber || !cardExpiry || !cardCvv || !cardName}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {loading ? "กำลังดำเนินการ..." : `ชำระเงิน ${order ? formatPrice(Number(order.total)) : ""}`}
            </button>

            <p className="text-xs text-gray-400 text-center">
              ข้อมูลบัตรถูกเข้ารหัสด้วย TLS 1.3 • ไม่เก็บข้อมูลบัตรในระบบ
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}
