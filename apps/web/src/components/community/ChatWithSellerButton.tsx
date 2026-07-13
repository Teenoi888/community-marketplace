"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"

interface Props {
  sellerId: string
}

export function ChatWithSellerButton({ sellerId }: Props) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  async function startChat() {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนแชทกับผู้ขาย", {
        action: { label: "เข้าสู่ระบบ", onClick: () => router.push("/login") },
      })
      return
    }
    if (sellerId === user.id) {
      toast.error("นี่คือร้านของคุณเอง")
      return
    }
    setLoading(true)
    try {
      const res = await api.post("/chat/conversations", { sellerId })
      router.push(`/chat?c=${res.data.data.id}`)
    } catch {
      toast.error("เริ่มแชทไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={startChat}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors flex-shrink-0 disabled:opacity-50"
    >
      <MessageSquare className="w-4 h-4" />
      แชทกับร้านค้า
    </button>
  )
}
