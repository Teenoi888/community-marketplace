"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Link from "next/link"
<<<<<<< HEAD
import { Package, CheckCircle, Truck, Clock, XCircle, Bell } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  pending_payment: { label: "รอชำระเงิน", color: "text-yellow-600 bg-yellow-50", icon: Clock, desc: "กรุณาชำระเงินเพื่อดำเนินการต่อ" },
  paid:            { label: "ชำระแล้ว", color: "text-blue-600 bg-blue-50", icon: CheckCircle, desc: "ผู้ขายได้รับการยืนยันการชำระเงินแล้ว" },
  preparing:       { label: "กำลังเตรียมสินค้า", color: "text-indigo-600 bg-indigo-50", icon: Package, desc: "ผู้ขายกำลังแพ็คสินค้าของคุณ" },
  shipped:         { label: "จัดส่งแล้ว", color: "text-primary-600 bg-primary-50", icon: Truck, desc: "สินค้าอยู่ระหว่างการจัดส่ง" },
  delivered:       { label: "ส่งถึงแล้ว", color: "text-green-600 bg-green-50", icon: CheckCircle, desc: "สินค้าถึงปลายทางแล้ว" },
  cancelled:       { label: "ยกเลิก", color: "text-red-600 bg-red-50", icon: XCircle, desc: "ออเดอร์นี้ถูกยกเลิก" },
=======
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
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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
<<<<<<< HEAD
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/orders")
      .then(r => setOrders(r.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

=======
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

>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-2xl mx-auto px-4 py-8">
<<<<<<< HEAD
        <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5" /> การแจ้งเตือน
        </h1>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : orders.length === 0 ? (
=======
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
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">ยังไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="space-y-3">
<<<<<<< HEAD
            {orders.map(order => {
              const s = STATUS_MAP[order.status] || STATUS_MAP.pending_payment
              const Icon = s.icon
              return (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.color}`}>
=======
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
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
<<<<<<< HEAD
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                      <span className="text-xs text-gray-400">{timeAgo(order.updatedAt || order.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{s.desc}</p>
                    <p className="text-xs text-gray-400 mt-0.5">ออเดอร์ #{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
=======
                      <span className={`text-sm font-semibold ${n.isRead ? "text-gray-700" : "text-gray-900"}`}>{n.title}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0" />}
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
