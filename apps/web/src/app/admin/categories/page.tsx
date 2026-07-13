"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react"
import { MainNav } from "@/components/layout/MainNav"
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

const EMOJI_PRESETS = ["🌾","🥫","🥬","🧶","🌿","🐟","🍵","🏆","🍎","🧀","🌺","🪵","🎨","👗","🪴","🐄","🍯","🧁","🌻","🥭"]

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
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">จัดการหมวดหมู่สินค้า</h1>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> เพิ่มหมวดหมู่
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="card border-2 border-primary-200 mb-4">
            <h3 className="font-semibold text-gray-800 mb-4">เพิ่มหมวดหมู่ใหม่</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Emoji</label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {EMOJI_PRESETS.map(e => (
                    <button key={e} type="button"
                      onClick={() => setAddForm(f => ({ ...f, emoji: e }))}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center border ${addForm.emoji === e ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}
                    >{e}</button>
                  ))}
                </div>
                <input value={addForm.emoji} onChange={e => setAddForm(f => ({ ...f, emoji: e.target.value }))}
                  className="input" placeholder="หรือพิมพ์ emoji" maxLength={4} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">ชื่อหมวดหมู่ (ภาษาไทย)</label>
                <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="input" placeholder="เช่น ผักสด" />
                <label className="text-xs font-medium text-gray-600 mb-1 block mt-3">Slug (ภาษาอังกฤษ a-z_)</label>
                <input value={addForm.slug} onChange={e => setAddForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                  className="input" placeholder="เช่น fresh_veg" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">ลำดับ</label>
                <input type="number" value={addForm.sortOrder} onChange={e => setAddForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="input" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="btn-outline px-4 py-2">ยกเลิก</button>
              <button onClick={addCategory} className="btn-primary px-4 py-2">บันทึก</button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">หมวดหมู่</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Slug</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">ลำดับ</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">สถานะ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    {editingId === cat.id ? (
                      // Edit row
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap items-center">
                          <input value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                            className="input w-16 text-center text-xl" maxLength={4} />
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
                        <td className="px-4 py-3">
                          <span className="text-xl mr-2">{cat.emoji}</span>
                          <span className="font-medium text-gray-800">{cat.name}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cat.slug}</code>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{cat.sortOrder}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleActive(cat)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {cat.isActive ? "แสดง" : "ซ่อน"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteCategory(cat.id)} disabled={deletingId === cat.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40">
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
              <div className="text-center py-12 text-gray-400">ยังไม่มีหมวดหมู่</div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
