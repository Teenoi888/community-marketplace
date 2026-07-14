"use client"
import { useEffect, useMemo, useState } from "react"
import { Search, Pencil, Trash2, Package, X, ChevronDown } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  description?: string
  price: string
  stock: number
  category: string
  status: "active" | "inactive" | "out_of_stock"
  shop: { id: string; name: string }
}

const STATUS_LABELS: Record<Product["status"], { label: string; className: string }> = {
  active:        { label: "แสดง",       className: "bg-green-100 text-green-700" },
  inactive:      { label: "ซ่อน",       className: "bg-gray-100 text-gray-500" },
  out_of_stock:  { label: "สินค้าหมด", className: "bg-red-100 text-red-600" },
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({ name: "", price: "", stock: 0, category: "", status: "active" as Product["status"] })
  const [saving, setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const r = await api.get("/admin/products")
      setProducts(r.data.data)
    } catch { toast.error("โหลดไม่สำเร็จ") }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q) || p.shop.name.toLowerCase().includes(q))
  }, [products, search])

  function startEdit(p: Product) {
    setEditTarget(p)
    setEditForm({ name: p.name, price: p.price, stock: p.stock, category: p.category, status: p.status })
  }

  async function saveEdit() {
    if (!editTarget) return
    setSaving(true)
    try {
      const r = await api.patch(`/admin/products/${editTarget.id}`, editForm)
      setProducts(prev => prev.map(p => p.id === editTarget.id ? { ...p, ...r.data.data } : p))
      toast.success("บันทึกแล้ว")
      setEditTarget(null)
    } catch { toast.error("บันทึกไม่สำเร็จ") }
    finally { setSaving(false) }
  }

  async function deleteProduct(id: string) {
    if (!confirm("ลบสินค้านี้? การลบไม่สามารถย้อนกลับได้")) return
    setDeletingId(id)
    try {
      await api.delete(`/admin/products/${id}`)
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success("ลบแล้ว")
    } catch { toast.error("ลบไม่สำเร็จ") }
    finally { setDeletingId(null) }
  }

  return (
    <AdminLayout title="สินค้าทุกร้าน">
      <>
        <div className="flex items-center justify-between gap-3 mb-6">
          <p className="text-sm text-gray-500 flex-shrink-0">
            {search ? `พบ ${filtered.length} จาก ${products.length} รายการ` : `สินค้าทั้งหมด ${products.length} รายการ`}
          </p>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสินค้าหรือร้าน..."
              className="input pl-9 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 text-gray-500 font-medium">สินค้า</th>
                  <th className="text-left px-5 py-3.5 text-gray-500 font-medium hidden sm:table-cell">ร้าน</th>
                  <th className="text-right px-5 py-3.5 text-gray-500 font-medium">ราคา</th>
                  <th className="text-center px-5 py-3.5 text-gray-500 font-medium">สต็อก</th>
                  <th className="text-center px-5 py-3.5 text-gray-500 font-medium">สถานะ</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const s = STATUS_LABELS[p.status]
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-800">{p.name}</td>
                      <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{p.shop.name}</td>
                      <td className="px-5 py-3.5 text-right text-gray-700">{fmt(Number(p.price))}</td>
                      <td className="px-5 py-3.5 text-center text-gray-500">{p.stock}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} disabled={deletingId === p.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                {search ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้า"}
              </div>
            )}
          </div>
        )}

        {/* Edit modal */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">แก้ไขสินค้า</h3>
                <button onClick={() => setEditTarget(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500">ร้าน: {editTarget.shop.name}</p>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">ชื่อสินค้า</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ราคา (บาท)</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">สต็อก</label>
                  <input type="number" value={editForm.stock} onChange={e => setEditForm(f => ({ ...f, stock: Number(e.target.value) }))} className="input" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">หมวดหมู่ (slug)</label>
                <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">สถานะ</label>
                <div className="relative">
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Product["status"] }))} className="input appearance-none pr-9">
                    <option value="active">แสดง</option>
                    <option value="inactive">ซ่อน</option>
                    <option value="out_of_stock">สินค้าหมด</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditTarget(null)} className="btn-outline flex-1">ยกเลิก</button>
                <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </AdminLayout>
  )
}
