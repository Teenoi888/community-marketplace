"use client"
import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Check, X, Tag } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Category {
  id: string
  slug: string
  name: string
  emoji: string
  sortOrder: number
  isActive: boolean
}

export default function AdminCategoriesPage() {
  const [categories, setCategories]   = useState<Category[]>([])
  const [loading, setLoading]         = useState(true)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({ name: "", emoji: "", slug: "", sortOrder: 0, isActive: true })
  const [addForm, setAddForm]   = useState({ name: "", emoji: "📦", slug: "", sortOrder: 0, isActive: true })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const r = await api.get("/admin/categories")
      setCategories(r.data.data)
    } catch { toast.error("โหลดไม่สำเร็จ") }
    finally { setLoading(false) }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, emoji: cat.emoji, slug: cat.slug, sortOrder: cat.sortOrder, isActive: cat.isActive })
  }

  async function saveEdit(id: string) {
    try {
      const r = await api.patch(`/admin/categories/${id}`, editForm)
      setCategories(prev => prev.map(c => c.id === id ? r.data.data : c))
      setEditingId(null)
      toast.success("บันทึกแล้ว")
    } catch { toast.error("บันทึกไม่สำเร็จ") }
  }

  async function addCategory() {
    if (!addForm.name || !addForm.emoji || !addForm.slug) return toast.error("กรุณากรอกข้อมูลให้ครบ")
    try {
      const r = await api.post("/admin/categories", addForm)
      setCategories(prev => [...prev, r.data.data])
      setAddForm({ name: "", emoji: "📦", slug: "", sortOrder: 0, isActive: true })
      setShowAdd(false)
      toast.success("เพิ่มหมวดหมู่แล้ว")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เพิ่มไม่สำเร็จ")
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("ลบหมวดหมู่นี้?")) return
    setDeletingId(id)
    try {
      await api.delete(`/admin/categories/${id}`)
      setCategories(prev => prev.filter(c => c.id !== id))
      toast.success("ลบแล้ว")
    } catch { toast.error("ลบไม่สำเร็จ") }
    finally { setDeletingId(null) }
  }

  async function toggleActive(cat: Category) {
    const r = await api.patch(`/admin/categories/${cat.id}`, { isActive: !cat.isActive })
    setCategories(prev => prev.map(c => c.id === cat.id ? r.data.data : c))
  }

  return (
    <AdminLayout title="จัดการหมวดหมู่สินค้า">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">หมวดหมู่ทั้งหมด {categories.length} รายการ</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" /> เพิ่มหมวดหมู่
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">เพิ่มหมวดหมู่ใหม่</h3>
          <div className="grid grid-cols-1 sm:grid-cols-[64px_1fr_1fr_88px] gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Emoji</label>
              <input value={addForm.emoji} onChange={e => setAddForm(f => ({ ...f, emoji: e.target.value }))}
                className="input text-center text-lg" maxLength={4} placeholder="📦" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">ชื่อหมวดหมู่</label>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="เช่น ผักสด" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Slug (a-z 0-9 _)</label>
              <input value={addForm.slug} onChange={e => setAddForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                className="input" placeholder="fresh_veg" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">ลำดับ</label>
              <input type="number" value={addForm.sortOrder} onChange={e => setAddForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="input text-center" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="btn-outline px-4 py-2 text-sm">ยกเลิก</button>
            <button onClick={addCategory} className="btn-primary px-4 py-2 text-sm">บันทึก</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 text-gray-500 font-medium">หมวดหมู่</th>
                <th className="text-left px-5 py-3.5 text-gray-500 font-medium hidden sm:table-cell">Slug</th>
                <th className="text-center px-5 py-3.5 text-gray-500 font-medium">ลำดับ</th>
                <th className="text-center px-5 py-3.5 text-gray-500 font-medium">สถานะ</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/60 transition-colors">
                  {editingId === cat.id ? (
                    // Edit row
                    <td colSpan={5} className="px-5 py-3.5">
                      <div className="flex gap-2 flex-wrap items-center">
                        <input value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                          className="input w-14 text-center" maxLength={4} />
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="input flex-1 min-w-[120px]" placeholder="ชื่อ" />
                        <input value={editForm.slug} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
                          className="input w-36" placeholder="slug" />
                        <input type="number" value={editForm.sortOrder} onChange={e => setEditForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                          className="input w-16 text-center" />
                        <button onClick={() => saveEdit(cat.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-5 py-3.5 font-medium text-gray-800">{cat.name}</td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cat.slug}</code>
                      </td>
                      <td className="px-5 py-3.5 text-center text-gray-500">{cat.sortOrder}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={() => toggleActive(cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${cat.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                          {cat.isActive ? "แสดง" : "ซ่อน"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteCategory(cat.id)} disabled={deletingId === cat.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              ยังไม่มีหมวดหมู่
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
