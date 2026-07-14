"use client"
import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Store, Lock, KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { AuthLayout } from "@/components/auth/AuthLayout"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get("phone") || ""

  const [otp, setOtp]                   = useState("")
  const [newPassword, setNewPassword]   = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPwd, setShowPwd]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6)              return toast.error("OTP ต้องมี 6 หลัก")
    if (newPassword.length < 6)        return toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    if (newPassword !== confirmPassword) return toast.error("รหัสผ่านไม่ตรงกัน")

    setLoading(true)
    try {
      await api.post("/auth/reset-password", { phone, otp, newPassword })
      setDone(true)
    } catch (err: any) {
      toast.error(err.response?.data?.error || "OTP ไม่ถูกต้องหรือหมดอายุ")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
        <p className="text-gray-500 text-sm">กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่</p>
        <button onClick={() => router.push("/login")} className="btn-primary w-full py-3">
          ไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {phone && (
        <div className="p-3 bg-gray-100 rounded-xl text-sm text-gray-600 text-center">
          เบอร์: <span className="font-semibold text-gray-800">{phone}</span>
        </div>
      )}

      {/* OTP */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">รหัส OTP (6 หลัก)</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="input pl-9 text-center tracking-[0.4em] text-lg font-bold"
            maxLength={6}
            inputMode="numeric"
          />
        </div>
      </div>

      {/* New password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPwd ? "text" : "password"}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            className="input pl-9 pr-10"
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPwd ? "text" : "password"}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="กรอกซ้ำอีกครั้ง"
            className={`input pl-9 ${confirmPassword && confirmPassword !== newPassword ? "border-red-400" : ""}`}
          />
        </div>
        {confirmPassword && confirmPassword !== newPassword && (
          <p className="text-red-500 text-xs mt-1">รหัสผ่านไม่ตรงกัน</p>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "กำลังเปลี่ยนรหัสผ่าน..." : "ตั้งรหัสผ่านใหม่"}
      </button>

      <p className="text-center text-xs text-gray-400">
        OTP หมดอายุใน 15 นาที ·{" "}
        <Link href="/forgot-password-phone" className="text-primary-600 hover:underline">ขอ OTP ใหม่</Link>
      </p>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-gray-500 text-sm mt-1">กรอก OTP และรหัสผ่านใหม่ของคุณ</p>
        </div>

        <Suspense fallback={<div className="text-center text-gray-400">กำลังโหลด...</div>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
    </AuthLayout>
  )
}
