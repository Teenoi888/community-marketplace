"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Package, AlertTriangle, Plus, Minus, History, X } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Product {
  id: string; name: string; stock: number; status: string
  price: string; images: string[]; category: string
}

interface StockLog {
  id: string; delta: number; reason: string; note: string | null; createdAt: string
  user: { name: string } | null
}

const REASONS = [
  { value: "restock", label: "เติมสต็อก" },
  { value: "damage", label: "สินค้าเสียหาย" },
  { value: "return", label: "ลูกค้าคืนสินค้า" },
  { value: "correction", label: "แก้ไขตัวเลข" },
  { value: "manual", label: "อื่นๆ" },
]

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState("restock")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<StockLog[]>([])
  const [logsProductId, setLogsProductId] = useState<string | null>(null)

  async function fetchProducts() {
    setLoading(true)
    try {
      const r = await api.get("/stock")
      setProducts(r.data.data || [])
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [])

  async function adjustStock(productId: string) {
    if (delta === 0) { toast.error("กรุณากรอกจำนวนที่ต้องการปรับ"); return }
    setSaving(true)
    try {
      await api.patch(`/stock/${productId}`, { delta, reason, note })
      toast.success("ปรับสต็อกแล้ว")
      setAdjusting(null)
      setDelta(0)
      setNote("")
      fetchProducts()
    } catch (e: any) {
      toast.error(e.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally { setSaving(false) }
  }

  async function fetchLogs(productId: string) {
    const r = await api.get(`/stock/${productId}/logs`)
    setLogs(r.data.data || [])
    setLogsProductId(productId)
  }

  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5)
  const outOfStock = products.filter(p => p.stock === 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" /> จัดการสต็อก
            </h1>
            <p className="text-sm text-gray-500">ปรับสต็อกสินค้าและดูประวัติ</p>
          </div>
        </div>

        {/* Alerts */}
        {outOfStock.length > 0 && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>หมดสต็อก {outOfStock.length} รายการ: {outOfStock.map(p => p.name).join(", ")}</span>
          </div>
        )}
        {lowStock.length > 0 && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>สต็อกเหลือน้อย {lowStock.length} รายการ: {lowStock.map(p => `${p.name} (${p.stock})`).join(", ")}</span>
          </div>
        )}

        {/* Product list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-medium uppercase">
                <tr>
                  <th className="text-left px-5 py-3">สินค้า</th>
                  <th className="text-center px-4 py-3">สต็อก</th>
                  <th className="text-center px-4 py-3">สถานะ</th>
                  <th className="text-right px-5 py-3">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><Package className="w-5 h-5" /></div>
                        }
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-bold text-base ${p.stock === 0 ? "text-red-600" : p.stock <= 5 ? "text-amber-600" : "text-gray-900"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.stock === 0 ? "bg-red-100 text-red-700" :
                        p.stock <= 5 ? "bg-amber-100 text-amber-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {p.stock === 0 ? "หมด" : p.stock <= 5 ? "เหลือน้อย" : "ปกติ"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => { setAdjusting(p.id); setDelta(0); setReason("restock"); setNote("") }}
                          className="text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          ปรับสต็อก
                        </button>
                        <button
                          onClick={() => fetchLogs(p.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                          title="ประวัติ"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">ยังไม่มีสินค้า</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Adjust modal */}
        {adjusting && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAdjusting(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">ปรับสต็อก</h3>
                <button onClick={() => setAdjusting(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                สินค้า: <strong>{products.find(p => p.id === adjusting)?.name}</strong>
                {" "}(สต็อกปัจจุบัน: {products.find(p => p.id === adjusting)?.stock})
              </p>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">จำนวนที่ปรับ</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDelta(d => d - 1)} className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={delta}
                    onChange={e => setDelta(Number(e.target.value))}
                    className="input text-center flex-1"
                  />
                  <button onClick={() => setDelta(d => d + 1)} className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">ค่าบวก = เพิ่มสต็อก, ค่าลบ = ลดสต็อก</p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">เหตุผล</label>
                <select value={reason} onChange={e => setReason(e.target.value)} className="input">
                  {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-1 block">หมายเหตุ (ถ้ามี)</label>
                <input value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="เช่น รับของจากซัพพลายเออร์" />
              </div>

              <button
                onClick={() => adjustStock(adjusting!)}
                disabled={saving || delta === 0}
                className="btn-primary w-full disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : `ปรับสต็อก ${delta > 0 ? "+" : ""}${delta} ชิ้น`}
              </button>
            </div>
          </div>
        )}

        {/* Logs modal */}
        {logsProductId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLogsProductId(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4" /> ประวัติการปรับสต็อก
                </h3>
                <button onClick={() => setLogsProductId(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2">
                {logs.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">ยังไม่มีประวัติ</p>}
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      log.delta > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {log.delta > 0 ? `+${log.delta}` : log.delta}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {REASONS.find(r => r.value === log.reason)?.label ?? log.reason}
                      </p>
                      {log.note && <p className="text-xs text-gray-500">{log.note}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {log.user?.name} · {new Date(log.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
