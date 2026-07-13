"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"
import { toast } from "sonner"
import { Users, Store, LogIn, CheckCircle, Loader2 } from "lucide-react"

interface Props {
  communityId: string
  communityName: string
}

interface Membership {
  isMember: boolean
  role: "admin" | "seller" | "member" | null
  hasShop: boolean
  shopId: string | null
}

export function JoinCommunityActions({ communityId, communityName }: Props) {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [openingShop, setOpeningShop] = useState(false)
  const [shopName, setShopName] = useState("")
  const [showShopForm, setShowShopForm] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    api.get(`/communities/${communityId}/my-membership`)
      .then(r => setMembership(r.data.data))
      .catch(() => setMembership({ isMember: false, role: null, hasShop: false, shopId: null }))
      .finally(() => setLoading(false))
  }, [communityId, user])

  async function handleJoin() {
    if (!user) { router.push("/login"); return }
    setJoining(true)
    try {
      await api.post(`/communities/${communityId}/join`)
      setMembership(m => m ? { ...m, isMember: true, role: "member" } : m)
      toast.success(`เข้าร่วม "${communityName}" แล้ว!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setJoining(false)
    }
  }

  async function handleOpenShop() {
    if (!shopName.trim()) { toast.error("กรุณาตั้งชื่อร้านก่อน"); return }
    setOpeningShop(true)
    try {
      const r = await api.post(`/communities/${communityId}/open-shop`, { shopName: shopName.trim() })
      setMembership(m => m ? { ...m, hasShop: true, role: "seller", shopId: r.data.data.shop.id } : m)
      toast.success("เปิดร้านสำเร็จ! เพิ่มสินค้าได้เลย")
      setShowShopForm(false)
      router.push(`/products/new?shopId=${r.data.data.shop.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setOpeningShop(false)
    }
  }

  if (loading) return (
    <div className="flex gap-2">
      <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  )

  // ไม่ได้ login
  if (!user) return (
    <button
      onClick={() => router.push("/login")}
      className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl border-2 border-white hover:bg-primary-50 transition-colors text-sm"
    >
      <LogIn className="w-4 h-4" /> เข้าสู่ระบบเพื่อเข้าร่วม
    </button>
  )

  // เป็น admin ของชุมชนนี้
  if (membership?.role === "admin") return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl text-sm font-medium">
      <CheckCircle className="w-4 h-4" /> คุณเป็นผู้ดูแลชุมชนนี้
    </div>
  )

  // มีร้านแล้ว
  if (membership?.hasShop) return (
    <div className="flex gap-2">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-700 rounded-xl text-sm font-medium border border-primary-200">
        <CheckCircle className="w-4 h-4" /> สมาชิก · มีร้านแล้ว
      </div>
      <button
        onClick={() => router.push(`/products/new?shopId=${membership.shopId}`)}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors text-sm"
      >
        <Store className="w-4 h-4" /> เพิ่มสินค้า
      </button>
    </div>
  )

  // เป็นสมาชิกแต่ยังไม่มีร้าน
  if (membership?.isMember) return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> เป็นสมาชิกแล้ว
        </div>
        <button
          onClick={() => setShowShopForm(!showShopForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-sm"
        >
          <Store className="w-4 h-4" /> เปิดร้านในชุมชนนี้
        </button>
      </div>
      {showShopForm && (
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            placeholder="ชื่อร้านของคุณ"
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl text-gray-800 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onKeyDown={e => e.key === "Enter" && handleOpenShop()}
          />
          <button
            onClick={handleOpenShop}
            disabled={openingShop || !shopName.trim()}
            className="px-5 py-2 bg-primary-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {openingShop ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            เปิดร้าน
          </button>
        </div>
      )}
    </div>
  )

  // ยังไม่ได้เข้าร่วม
  return (
    <button
      onClick={handleJoin}
      disabled={joining}
      className="flex items-center gap-2 px-6 py-2.5 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-colors text-sm disabled:opacity-60"
    >
      {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
      เข้าร่วมชุมชน
    </button>
  )
}
