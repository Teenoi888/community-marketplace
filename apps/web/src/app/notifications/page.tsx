"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Link from "next/link"
import { Package, Bell, CheckCheck } from "lucide-react"
import { toast } from "sonner"

interface Notification {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, any> = {
  order_status: Package,
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/notifications")
      .then(r => setNotifications(r.data.data || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [])

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch { /* ignore — optimistic update already applied */ }
  }

  async function markAllRead() {
    const hadUnread = notifications.some(n => !n.isRead)
    if (!hadUnread) return
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    try {
      await api.patch("/notifications/read-all")
    } catch {
      toast.error("อ่านทั้งหมดไม่สำเร็จ")
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5" /> การแจ้งเตือน
          </h1>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline">
              <CheckCheck className="w-3.5 h-3.5" /> อ่านทั้งหมด
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">ยังไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const Icon = TYPE_ICON[n.type] || Bell
              return (
                <Link
                  key={n.id}
                  href={n.link || "#"}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`flex items-start gap-4 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border ${
                    n.isRead ? "bg-white border-gray-100" : "bg-primary-50/50 border-primary-100"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.isRead ? "text-gray-500 bg-gray-100" : "text-primary-600 bg-primary-100"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${n.isRead ? "text-gray-700" : "text-gray-900"}`}>{n.title}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0" />}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
