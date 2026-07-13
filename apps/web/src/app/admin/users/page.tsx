"use client"
import { useEffect, useState } from "react"
import { Search, Shield, ShieldOff, KeyRound, Phone, User } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface UserRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<UserRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers(phone?: string) {
    setLoading(true)
    try {
      const url = phone ? `/admin/users/search?phone=${encodeURIComponent(phone)}` : "/admin/users"
      const r = await api.get(url)
      setUsers(r.data.data)
    } catch { toast.error("โหลดไม่สำเร็จ") }
    finally { setLoading(false) }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadUsers(search || undefined)
  }

  async function toggleRole(user: UserRow) {
    const newRole = user.role === "admin" ? "user" : "admin"
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      toast.success(`เปลี่ยน role เป็น ${newRole} แล้ว`)
    } catch { toast.error("ไม่สำเร็จ") }
  }

  async function resetPassword() {
    if (!resetTarget || newPassword.length < 6) return toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    setSaving(true)
    try {
      await api.patch(`/admin/users/${resetTarget.id}/reset-password`, { newPassword })
      toast.success(`รีเซ็ตรหัสผ่านของ ${resetTarget.name} แล้ว`)
      setResetTarget(null)
      setNewPassword("")
    } catch { toast.error("ไม่สำเร็จ") }
    finally { setSaving(false) }
  }

  return (
    <AdminLayout title="จัดการผู้ใช้">
      <>
      <div className="max-w-4xl">

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาด้วยเบอร์โทร..."
              className="input pl-9"
              type="tel"
            />
          </div>
          <button type="submit" className="btn-primary px-5">ค้นหา</button>
          {search && (
            <button type="button" onClick={() => { setSearch(""); loadUsers() }} className="btn-outline px-4">
              ล้าง
            </button>
          )}
        </form>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">ชื่อ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">เบอร์โทร</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Role</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-primary-600" />
                        </div>
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {u.phone || <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {u.role === "admin" ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => { setResetTarget(u); setNewPassword("") }}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> รีเซ็ต
                        </button>
                        <button
                          onClick={() => toggleRole(u)}
                          className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                            u.role === "admin"
                              ? "text-purple-600 hover:bg-purple-50"
                              : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                          }`}
                        >
                          {u.role === "admin" ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                          {u.role === "admin" ? "ถอด Admin" : "ให้ Admin"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-gray-400">ไม่พบผู้ใช้</div>
            )}
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900">รีเซ็ตรหัสผ่าน</h3>
            <p className="text-sm text-gray-600">
              ผู้ใช้: <span className="font-semibold">{resetTarget.name}</span> ({resetTarget.phone})
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">รหัสผ่านใหม่</label>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="input"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResetTarget(null)} className="btn-outline flex-1">ยกเลิก</button>
              <button onClick={resetPassword} disabled={saving || newPassword.length < 6} className="btn-primary flex-1 disabled:opacity-60">
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
