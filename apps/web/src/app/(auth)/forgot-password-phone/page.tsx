"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Store, Phone, ArrowLeft, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { AuthLayout } from "@/components/auth/AuthLayout"

export default function ForgotPasswordPhonePage() {
  const router = useRouter()
  const [phone, setPhone]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [otpPreview, setOtpPreview] = useState<string | null>(null)  // dev mode เท่านั้น

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length !== 10) return toast.error("กรุณากรอกเบอร์โทรให้ถูกต้อง")

    setLoading(true)
    try {
      const res = await api.post("/auth/forgot-password", { phone })
      if (res.data.otpPreview) {
        // Dev mode: แสดง OTP บนหน้าจอ
        setOtpPreview(res.data.otpPreview)
      } else {
        toast.success("ส่ง OTP ไปยัง SMS แล้ว กรุณาตรวจสอบเบอร์โทรของคุณ")
        router.push(`/reset-password?phone=${encodeURIComponent(phone)}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ลืมรหัสผ่าน</h1>
          <p className="text-gray-500 text-sm mt-1">กรอกเบอร์โทรที่ลงทะเบียนไว้</p>
        </div>

        {/* Dev mode: OTP preview */}
        {otpPreview && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
            <p className="text-sm font-medium text-amber-700">
              🔧 โหมดทดสอบ — OTP ของคุณคือ
            </p>
            <p className="text-4xl font-bold tracking-[0.3em] text-amber-800">{otpPreview}</p>
            <p className="text-xs text-amber-600">หมดอายุใน 15 นาที</p>
            <p className="text-xs text-gray-500">(ใน production จะส่งผ่าน SMS แทน)</p>
            <button
              onClick={() => router.push(`/reset-password?phone=${encodeURIComponent(phone)}`)}
              className="btn-primary w-full mt-2"
            >
              ไปกรอก OTP →
            </button>
          </div>
        )}

        {!otpPreview && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="0812345678"
                  className="input pl-9"
                  maxLength={10}
                />
              </div>
            </div>

            <button type="submit" disabled={loading || phone.length !== 10} className="btn-primary w-full py-3">
              {loading ? "กำลังส่ง OTP..." : "ขอรหัส OTP"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
    </AuthLayout>
  )
}
