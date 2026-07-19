"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Zap, Plus, Trash2, X, Clock } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface FlashSale {
  id: string
  discountPct: number
  startsAt: string
  endsAt: string
  isActive: boolean
  product: { name: string; price: string; images: string[] }
}

interface Product {
  id: string
  name: string
  price: string
  stock: number
}

function fmt(d: string) {
  return new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function saleStatus(sale: FlashSale) {
  const now = Date.now()
  const start = new Date(sale.startsAt).getTime()
  const end = new Date(sale.endsAt).getTime()
  if (!sale.isActive) return { label: "ยกเลิกแล้ว", color: "bg-gray-100 text-gray-500" }
  if (now < start) return { label: "รอเริ่ม", color: "bg-blue-100 text-blue-600" }
  if (now >= start && now <= end) return { label: "กำลัง Active", color: "bg-green-100 text-green-700" }
  return { label: "หมดเวลา", color: "bg-gray-100 text-gray-400" }
}

export default function FlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ productId: "", discountPct: 10, startsAt: "", endsAt: "" })
  const [saving, setSaving] = useState(false)

  async function fetchSales() {
    try {
      const [sr, pr] = await Promise.all([
        api.get("/flash-sales/shop"),
        api.get("/stock"),
      ])
      setSales(sr.data.data || [])
      setProducts((pr.data.data || []).filter((p: any) => p.stock > 0))
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSales() }, [])

  // Set default start/end times when opening form
  function openForm() {
    const now = new Date()
    const start = new Date(now.getTime() + 5 * 60 * 1000) // 5 min from now
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
    const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm(f => ({ ...f, productId: products[0]?.id || "", startsAt: toLocal(start), endsAt: toLocal(end) }))
    setShowForm(true)
  }

  async function createSale() {
    if (!form.productId || !form.startsAt || !form.endsAt) { toast.error("กรุณากรอกข้อมูลให้ครบ"); return }
    setSaving(true)
    try {
      await api.post("/flash-sales", {
        productId: form.productId,
        discountPct: form.discountPct,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      })
      toast.success("สร้าง Flash Sale แล้ว!")
      setShowForm(false)
      fetchSales()
    } catch (e: any) {
      toast.error(e.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally { setSaving(false) }
  }

  async function deleteSale(id: string) {
    try {
      await api.delete(`/flash-sales/${id}`)
      toast.success("ยกเลิก Flash Sale แล้ว")
      setSales(s => s.map(x => x.id === id ? { ...x, isActive: false } : x))
    } catch { toast.error("เกิดข้อผิดพลาด") }
  }

  const selectedProduct = products.find(p => p.id === form.productId)
  const previewPrice = selectedProduct
    ? Math.round(Number(selectedProduct.price) * (1 - form.discountPct / 100))
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500 fill-yellow-400" /> Flash Sale
              </h1>
              <p className="text-sm text-gray-500">โปรโมชั่นลดราคาชั่วคราว</p>
            </div>
          </div>
          <button onClick={openForm} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> สร้าง Flash Sale
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">ยังไม่มี Flash Sale</p>
            <p className="text-sm mt-1">กดปุ่มสร้างเพื่อเพิ่มโปรโมชั่น</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map(sale => {
              const status = saleStatus(sale)
              const discounted = Math.round(Number(sale.product.price) * (1 - sale.discountPct / 100))
              return (
                <div key={sale.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {sale.product.images?.[0]
                      ? <img src={sale.product.images[0]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{sale.product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-red-600 font-bold text-sm">฿{discounted.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 line-through">฿{Number(sale.product.price).toLocaleString()}</span>
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">-{sale.discountPct}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {fmt(sale.startsAt)} → {fmt(sale.endsAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    {sale.isActive && (
                      <button onClick={() => deleteSale(sale.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        title="ยกเลิก">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" /> สร้าง Flash Sale
                </h3>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">สินค้า</label>
                  <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} className="input">
                    <option value="">-- เลือกสินค้า --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (฿{Number(p.price).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">ส่วนลด (%)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={5} max={90} step={5}
                      value={form.discountPct}
                      onChange={e => setForm(f => ({ ...f, discountPct: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-bold text-red-600 text-lg">{form.discountPct}%</span>
                  </div>
                  {previewPrice && (
                    <p className="text-xs text-gray-500 mt-1">
                      ราคาหลังลด: <span className="text-red-600 font-bold">฿{previewPrice.toLocaleString()}</span>
                      {" "}(จาก ฿{Number(selectedProduct?.price).toLocaleString()})
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">เริ่มต้น</label>
                    <input type="datetime-local" value={form.startsAt}
                      onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className="input text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">สิ้นสุด</label>
                    <input type="datetime-local" value={form.endsAt}
                      onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className="input text-sm" />
                  </div>
                </div>
              </div>

              <button
                onClick={createSale}
                disabled={saving || !form.productId}
                className="mt-5 btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {saving ? "กำลังสร้าง..." : "สร้าง Flash Sale"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
