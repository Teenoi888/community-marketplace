"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Percent, Tag } from "lucide-react"
import { MainNav } from "@/components/layout/MainNav"
import { api } from "@/lib/api"

interface Coupon {
  id: string
  code: string
  discountType: "percent" | "fixed"
  discountValue: string
  minOrderAmount: string
  usageLimit: number | null
  usedCount: number
  active: boolean
  expiresAt: string | null
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function CouponsPage() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent")
  const [discountValue, setDiscountValue] = useState("")
  const [minOrderAmount, setMinOrderAmount] = useState("")
  const [usageLimit, setUsageLimit] = useState("")

  async function loadCoupons(id: string) {
    setLoading(true)
    try {
      const r = await api.get(`/coupons/mine?shopId=${id}`)
      setCoupons(r.data.data || [])
    } catch {
      toast.error("โหลดคูปองไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get("/auth/me/shop")
      .then(r => {
        const id = r.data.data.id
        setShopId(id)
        loadCoupons(id)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shopId) return
    if (!code.trim()) return toast.error("กรอกโค้ดส่วนลด")
    const val = Number(discountValue)
    if (!val || val <= 0) return toast.error("กรอกมูลค่าส่วนลดให้ถูกต้อง")

    setSubmitting(true)
    try {
      await api.post("/coupons", {
        shopId,
        code,
        discountType,
        discountValue: val,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
      })
      toast.success("สร้างคูปองสำเร็จ")
      setCode(""); setDiscountValue(""); setMinOrderAmount(""); setUsageLimit("")
      loadCoupons(shopId)
    } catch (err: any) {
      toast.error(err.response?.data?.error || "สร้างคูปองไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      await api.patch(`/coupons/${coupon.id}`, { active: !coupon.active })
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c))
    } catch {
      toast.error("อัปเดตไม่สำเร็จ")
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">คูปองส่วนลด</h1>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : !shopId ? (
          <div className="text-center py-20 text-gray-400">ยังไม่มีร้านค้า</div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="card space-y-4">
              <h2 className="font-semibold text-gray-800">สร้างคูปองใหม่</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">โค้ดส่วนลด</label>
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="input tracking-widest" placeholder="SAVE50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทส่วนลด</label>
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as "percent" | "fixed")} className="input">
                    <option value="percent">เปอร์เซ็นต์ (%)</option>
                    <option value="fixed">จำนวนเงิน (บาท)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่าส่วนลด</label>
                  <input type="number" min="1" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="input" placeholder={discountType === "percent" ? "10" : "50"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ยอดสั่งซื้อขั้นต่ำ (บาท)</label>
                  <input type="number" min="0" value={minOrderAmount} onChange={e => setMinOrderAmount(e.target.value)} className="input" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนสิทธิ์ (เว้นว่าง = ไม่จำกัด)</label>
                  <input type="number" min="1" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="input" placeholder="100" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? "กำลังสร้าง..." : "สร้างคูปอง"}
              </button>
            </form>

            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" /> คูปองของร้าน
              </h2>
              {coupons.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีคูปอง</p>
              ) : (
                <div className="space-y-2">
                  {coupons.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="font-mono font-semibold text-gray-900">{c.code}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          {c.discountType === "percent" ? `ลด ${c.discountValue}%` : `ลด ${fmt(Number(c.discountValue))}`}
                          {" · ใช้แล้ว "}{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleActive(c)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                          c.active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        {c.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
