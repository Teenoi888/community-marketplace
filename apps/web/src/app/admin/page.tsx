"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Package, Store, ShoppingBag, ShieldCheck, ChevronRight, Tag, ScrollText } from "lucide-react"
import Link from "next/link"
import { MainNav } from "@/components/layout/MainNav"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Stats {
  totalUsers: number
  totalProducts: number
  totalCommunities: number
  totalOrders: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [secret, setSecret] = useState("")
  const [showPromote, setShowPromote] = useState(false)

  useEffect(() => {
    api.get("/admin/stats")
      .then(r => setStats(r.data.data))
      .catch(err => {
        if (err.response?.status === 403) {
          // Not admin yet — show promote form
          setShowPromote(true)
        } else if (err.response?.status === 401) {
          router.push("/login")
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function promote() {
    setPromoting(true)
    try {
      await api.post("/admin/promote", { secret })
      toast.success("อัปเกรดเป็น Admin แล้ว! รีโหลดหน้า...")
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      toast.error("Secret ไม่ถูกต้อง")
    } finally {
      setPromoting(false)
    }
  }

  if (loading) {
    return (
      <main>
        <MainNav />
        <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-400">กำลังโหลด...</div>
      </main>
    )
  }

  if (showPromote) {
    return (
      <main>
        <MainNav />
        <div className="max-w-sm mx-auto px-4 py-16">
          <div className="card text-center space-y-4">
            <ShieldCheck className="w-12 h-12 text-primary-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-sm text-gray-500">กรอก Admin Secret เพื่อเข้าถึงหน้า Admin</p>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Admin Secret"
              className="input text-center tracking-widest"
              onKeyDown={e => e.key === "Enter" && promote()}
            />
            <button onClick={promote} disabled={promoting || !secret} className="btn-primary w-full">
              {promoting ? "กำลังยืนยัน..." : "ยืนยัน"}
            </button>
            <p className="text-xs text-gray-400">Secret ตั้งไว้ใน Railway env: <code>ADMIN_SECRET</code></p>
          </div>
        </div>
      </main>
    )
  }

  const statCards = [
    { label: "ผู้ใช้ทั้งหมด",     value: stats?.totalUsers,       icon: Users,       color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "สินค้าทั้งหมด",     value: stats?.totalProducts,    icon: Package,     color: "text-green-600",  bg: "bg-green-50" },
    { label: "ชุมชนทั้งหมด",     value: stats?.totalCommunities, icon: Store,       color: "text-purple-600", bg: "bg-purple-50" },
    { label: "คำสั่งซื้อทั้งหมด", value: stats?.totalOrders,      icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" },
  ]

  const menuItems = [
    { href: "/admin/categories", label: "จัดการหมวดหมู่สินค้า", icon: Tag, desc: "เพิ่ม ลบ แก้ไขหมวดหมู่ที่แสดงในหน้าแรก" },
    { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users, desc: "ดูรายชื่อผู้ใช้ เปลี่ยน role admin" },
    { href: "/admin/activity-logs", label: "Log กิจกรรม", icon: ScrollText, desc: "ตรวจสอบว่า admin คนไหนทำอะไรไปบ้าง" },
  ]

  return (
    <AdminLayout title="แดชบอร์ด">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-3">
            <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5.5 h-5.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-gray-900 leading-tight">{value?.toLocaleString() ?? "—"}</p>
              <p className="text-xs text-gray-500 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">ตั้งค่าระบบ</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {menuItems.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition-all group">
            <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5.5 h-5.5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{label}</p>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </AdminLayout>
  )
}
