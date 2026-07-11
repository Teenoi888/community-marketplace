"use client"
import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Store, Phone, Lock, User, Eye, EyeOff, Mail } from "lucide-react"
import { RiLineFill } from "react-icons/ri"
import { FcGoogle } from "react-icons/fc"
import { FaFacebook } from "react-icons/fa"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"
import { useRouter } from "next/navigation"

const schema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  phone: z.string().regex(/^\d{10}$/, "เบอร์โทรต้องเป็นตัวเลข 10 หลัก"),
  email: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { onChange: onPhoneChange, ...phoneField } = register("phone")

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post("/auth/register", {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        password: data.password,
      })
      localStorage.setItem("access_token", res.data.accessToken)
      setUser(res.data.user)
      toast.success("สมัครสมาชิกสำเร็จ ยินดีต้อนรับ!")
      router.push("/")
    } catch (err: any) {
      const message = err?.response?.data?.error || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่"
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ตลาดชุมชน</h1>
          <p className="text-gray-500 text-sm mt-1">สมัครสมาชิกเพื่อเริ่มซื้อ-ขายสินค้า</p>
        </div>

        {/* Social Register */}
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2.5 mb-2.5">
            <span />
            <p className="text-center text-lg font-bold text-gray-700">สมัครด้วย</p>
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

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("name")} type="text" placeholder="สมชาย ใจดี" className="input pl-9" />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("email")} type="email" placeholder="you@example.com" className="input pl-9" />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("confirmPassword")} type={showConfirmPassword ? "text" : "password"} placeholder="••••••" className="input pl-9 pr-9" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  )
}
