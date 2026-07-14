"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Store, Mail, KeyRound, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { api } from "@/lib/api"
import { useCooldown } from "@/lib/hooks/useCooldown"
import { z } from "zod"
import { AuthLayout } from "@/components/auth/AuthLayout"

const emailSchema = z.string().email("อีเมลไม่ถูกต้อง")
const passwordSchema = z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { remaining: cooldown, start: startCooldown } = useCooldown(60)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sent) codeInputRef.current?.focus()
  }, [sent])

  async function sendResetCode() {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }
    setSubmitting(true)
    try {
      await api.post("/auth/password/forgot", { email })
      setSent(true)
      startCooldown()
      toast.success("ถ้าอีเมลนี้มีอยู่ในระบบ เราได้ส่งรหัสไปให้แล้ว")
    } catch {
      toast.error("ส่งรหัสไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setSubmitting(false)
    }
  }

  async function resetPassword() {
    if (code.length !== 6) {
      toast.error("กรุณากรอกรหัส OTP 6 หลัก")
      return
    }
    const parsed = passwordSchema.safeParse(newPassword)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน")
      return
    }
    setSubmitting(true)
    try {
      await api.post("/auth/password/reset", { email, code, newPassword })
      toast.success("ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง")
      router.push("/login")
    } catch {
      toast.error("รหัส OTP ไม่ถูกต้องหรือหมดอายุ")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ตลาดชุมชน</h1>
          <p className="text-gray-500 text-sm mt-1">ลืมรหัสผ่าน</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลที่ผูกกับบัญชี</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sent}
                placeholder="you@example.com"
                className="input pl-9 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          {sent && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัส OTP (6 หลัก)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="input pl-9 tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••"
                    className="input pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="input pl-9 pr-9"
                  />
                </div>
              </div>
            </>
          )}

          {!sent ? (
            <button type="button" onClick={sendResetCode} disabled={submitting || cooldown > 0} className="btn-primary w-full py-3">
              {submitting ? "กำลังส่ง..." : cooldown > 0 ? `ส่งรหัสใหม่ได้ใน ${cooldown} วิ` : "ส่งรหัสรีเซ็ตรหัสผ่าน"}
            </button>
          ) : (
            <>
              <button type="button" onClick={resetPassword} disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
              </button>
              <button
                type="button"
                onClick={() => { setSent(false); setCode(""); setNewPassword(""); setConfirmPassword("") }}
                className="w-full text-sm text-gray-500 hover:underline"
              >
                เปลี่ยนอีเมล / ส่งรหัสใหม่
              </button>
            </>
          )}
        </div>

        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:underline mt-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
    </AuthLayout>
  )
}
