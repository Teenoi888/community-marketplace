"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Store, Phone, Lock, Mail, KeyRound, Eye, EyeOff } from "lucide-react"
import { RiLineFill } from "react-icons/ri"
import { FcGoogle } from "react-icons/fc"
import { FaFacebook } from "react-icons/fa"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"
import { useCooldown } from "@/lib/hooks/useCooldown"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/AuthLayout"

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
})

type FormData = z.infer<typeof schema>

const emailSchema = z.string().email("อีเมลไม่ถูกต้อง")

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const { onChange: onPhoneChange, ...phoneField } = register("phone")
  const [showPassword, setShowPassword] = useState(false)

  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone")
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpSubmitting, setOtpSubmitting] = useState(false)
  const { remaining: otpCooldown, start: startOtpCooldown } = useCooldown(60)
  const otpInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (otpSent) otpInputRef.current?.focus()
  }, [otpSent])

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post("/auth/login", data)
      localStorage.setItem("access_token", res.data.accessToken)
      setUser(res.data.user)
      toast.success("เข้าสู่ระบบสำเร็จ")
      router.push(res.data.user.role === "admin" ? "/admin" : "/")
    } catch {
      toast.error("เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง")
    }
  }

  async function sendOtp() {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }
    setOtpSubmitting(true)
    try {
      await api.post("/auth/otp/request", { email })
      setOtpSent(true)
      startOtpCooldown()
      toast.success("ส่งรหัส OTP ไปที่อีเมลแล้ว")
    } catch {
      toast.error("ส่งรหัส OTP ไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setOtpSubmitting(false)
    }
  }

  async function verifyOtp(codeOverride?: string) {
    const codeToVerify = codeOverride ?? otpCode
    if (codeToVerify.length !== 6) {
      toast.error("กรุณากรอกรหัส OTP 6 หลัก")
      return
    }
    setOtpSubmitting(true)
    try {
      const res = await api.post("/auth/otp/verify", { email, code: codeToVerify })
      localStorage.setItem("access_token", res.data.accessToken)
      setUser(res.data.user)
      toast.success("เข้าสู่ระบบสำเร็จ")
      router.push(res.data.user.role === "admin" ? "/admin" : "/")
    } catch {
      toast.error("รหัส OTP ไม่ถูกต้องหรือหมดอายุ")
    } finally {
      setOtpSubmitting(false)
    }
  }

  return (
    <AuthLayout>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ตลาดชุมชน</h1>
          <p className="text-gray-500 text-sm mt-1">เข้าสู่ระบบเพื่อซื้อ-ขายสินค้า</p>
        </div>

        {/* Social Login */}
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2.5 mb-2.5">
            <span />
            <p className="text-center text-lg font-bold text-gray-700">เข้าสู่ระบบด้วย</p>
            <span />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/line/auth`}
              className="flex items-center justify-center gap-1.5 w-full py-3 px-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 rounded-xl transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-[#06C755] flex items-center justify-center shrink-0">
                <RiLineFill className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-semibold text-gray-800">LINE</span>
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/google/auth`}
              className="flex items-center justify-center gap-1.5 w-full py-3 px-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 rounded-xl transition-colors"
            >
              <FcGoogle className="w-6 h-6 shrink-0" />
              <span className="text-sm font-semibold text-gray-800">Google</span>
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/facebook/auth`}
              className="flex items-center justify-center gap-1.5 w-full py-3 px-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 rounded-xl transition-colors"
            >
              <FaFacebook className="w-6 h-6 shrink-0 text-[#1877F2]" />
              <span className="text-sm font-semibold text-gray-800">Facebook</span>
            </a>
          </div>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-gray-50 px-2">หรือ</span>
          </div>
        </div>

        {/* Method toggle */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
          <button
            type="button"
            onClick={() => setLoginMethod("phone")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMethod === "phone" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
          >
            เบอร์โทรศัพท์
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod("email")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMethod === "email" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
          >
            อีเมล (OTP)
          </button>
        </div>

        {loginMethod === "phone" ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...phoneField}
                  onChange={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10)
                    onPhoneChange(e)
                  }}
                  type="tel"
                  inputMode="numeric"
                  placeholder="0812345678"
                  className="input pl-9"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">รหัสผ่าน</label>
                <Link href="/forgot-password-phone" className="text-xs text-primary-600 hover:underline">ลืมรหัสผ่าน?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••" className="input pl-9 pr-9" />
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
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  placeholder="you@example.com"
                  className="input pl-9 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัส OTP (6 หลัก)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setOtpCode(cleaned)
                      if (cleaned.length === 6) verifyOtp(cleaned)
                    }}
                    placeholder="123456"
                    className="input pl-9 tracking-widest"
                  />
                </div>
              </div>
            )}

            {!otpSent ? (
              <button type="button" onClick={sendOtp} disabled={otpSubmitting || otpCooldown > 0} className="btn-primary w-full py-3">
                {otpSubmitting ? "กำลังส่ง..." : otpCooldown > 0 ? `ส่งรหัสใหม่ได้ใน ${otpCooldown} วิ` : "ส่งรหัส OTP"}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => verifyOtp()} disabled={otpSubmitting} className="btn-primary w-full py-3">
                  {otpSubmitting ? "กำลังตรวจสอบ..." : "ยืนยันรหัส OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode("") }}
                  className="w-full text-sm text-gray-500 hover:underline"
                >
                  เปลี่ยนอีเมล / ส่งรหัสใหม่
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">สมัครสมาชิก</Link>
        </p>
    </AuthLayout>
  )
}
