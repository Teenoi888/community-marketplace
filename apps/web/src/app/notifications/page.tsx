"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import Link from "next/link"
import { Package, CheckCircle, Truck, Clock, XCircle, Bell } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  pending_payment: { label: "รอชำระเงิน", color: "text-yellow-600 bg-yellow-50", icon: Clock, desc: "กรุณาชำระเงินเพื่อดำเนินการต่อ" },
  paid:            { label: "ชำระแล้ว", color: "text-blue-600 bg-blue-50", icon: CheckCircle, desc: "ผู้ขายได้รับการยืนยันการชำระเงินแล้ว" },
  preparing:       { label: "กำลังเตรียมสินค้า", color: "text-indigo-600 bg-indigo-50", icon: Package, desc: "ผู้ขายกำลังแพ็คสินค้าของคุณ" },
  shipped:         { label: "จัดส่งแล้ว", color: "text-primary-600 bg-primary-50", icon: Truck, desc: "สินค้าอยู่ระหว่างการจัดส่ง" },
  delivered:       { label: "ส่งถึงแล้ว", color: "text-green-600 bg-green-50", icon: CheckCircle, desc: "สินค้าถึงปลายทางแล้ว" },
  cancelled:       { label: "ยกเลิก", color: "text-red-600 bg-red-50", icon: XCircle, desc: "ออเดอร์นี้ถูกยกเลิก" },
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
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/orders")
      .then(r => setOrders(r.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5" /> การแจ้งเตือน
        </h1>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">ยังไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const s = STATUS_MAP[order.status] || STATUS_MAP.pending_payment
              const Icon = s.icon
              return (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                      <span className="text-xs text-gray-400">{timeAgo(order.updatedAt || order.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{s.desc}</p>
                    <p className="text-xs text-gray-400 mt-0.5">ออเดอร์ #{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
