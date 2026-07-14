"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Radio, Users, ArrowLeft } from "lucide-react"
import { api } from "@/lib/api"
import { MainNav } from "@/components/layout/MainNav"
import { useAuthStore } from "@/lib/store/auth"
import { toast } from "sonner"

export default function LiveListPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [showForm, setShowForm] = useState(false)
  const user = useAuthStore(s => s.user)
  const router = useRouter()

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 10_000)
    return () => clearInterval(t)
  }, [])

  async function refresh() {
    try {
      const r = await api.get("/live")
      setSessions(r.data.data || [])
    } finally {
      setLoading(false)
    }
  }

  async function startLive() {
    if (!title.trim()) return toast.error("กรุณาใส่ชื่อ live")
    setCreating(true)
    try {
      const r = await api.post("/live", { title })
      router.push(`/live/broadcast?id=${r.data.data.id}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" /> ไลฟ์สด
            </h1>
          </div>
          {user && (
            <button onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2 text-sm">
              <Radio className="w-4 h-4" /> เริ่มไลฟ์
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-primary-100 mb-6">
            <h2 className="font-semibold text-gray-800 mb-3">ตั้งชื่อไลฟ์ของคุณ</h2>
            <div className="flex gap-3">
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="เช่น ผักสดวันนี้ ลดราคา 20%!"
                className="input flex-1"
                onKeyDown={e => e.key === "Enter" && startLive()}
              />
              <button onClick={startLive} disabled={creating} className="btn-primary px-6">
                {creating ? "กำลังเปิด..." : "เริ่มเลย"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">ยังไม่มีไลฟ์ที่กำลังออกอากาศ</p>
            <p className="text-gray-400 text-sm mt-1">กลับมาใหม่ภายหลังครับ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(s => (
              <Link key={s.id} href={`/live/${s.id}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="bg-gradient-to-br from-red-500 to-pink-600 h-36 flex items-center justify-center relative">
                  <Radio className="w-12 h-12 text-white/50" />
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </span>
                  <span className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3" /> {s.viewer_count}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 line-clamp-1">{s.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.shop_name} · {s.seller_name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
