"use client"
import { useEffect, useState } from "react"
import { ScrollText, User, Tag, Package, ShieldCheck } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface ActivityLog {
  id: string
  action: string
  targetType: string
  targetId: string | null
  details: Record<string, unknown> | null
  createdAt: string
  admin: { id: string; name: string } | null
}

const ACTION_LABELS: Record<string, string> = {
  "category.create": "สร้างหมวดหมู่สินค้า",
  "category.update": "แก้ไขหมวดหมู่สินค้า",
  "category.delete": "ลบหมวดหมู่สินค้า",
  "product.update": "แก้ไขสินค้า",
  "product.delete": "ลบสินค้า",
  "user.role_change": "เปลี่ยนสิทธิ์ผู้ใช้",
  "user.reset_password": "รีเซ็ตรหัสผ่านผู้ใช้",
}

const TARGET_ICON: Record<string, any> = {
  category: Tag,
  product: Package,
  user: User,
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "เมื่อกี้"
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

function formatDetails(action: string, details: Record<string, unknown> | null) {
  if (!details) return null
  if (action === "user.role_change") return `role ใหม่: ${details.newRole}`
  if (typeof details.name === "string" && Object.keys(details).length === 1) return details.name
  const parts = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`)
  return parts.join(", ") || null
}

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/admin/activity-logs?limit=100")
      .then(r => setLogs(r.data.data))
      .catch(() => toast.error("โหลด log ไม่สำเร็จ"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout title="Log กิจกรรม">
      <div className="max-w-4xl">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีกิจกรรมของ admin</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">การกระทำ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">โดย</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">รายละเอียด</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">เวลา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const Icon = TARGET_ICON[log.targetType] || ShieldCheck
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-primary-600" />
                          </div>
                          <span className="font-medium text-gray-800">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.admin?.name || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell truncate max-w-xs">
                        {formatDetails(log.action, log.details) || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                        {timeAgo(log.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
