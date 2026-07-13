"use client"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Store, Phone, Lock, Eye, EyeOff } from "lucide-react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"
import { useRouter } from "next/navigation"

const schema = z.object({
  phone: z.string().min(9, "เบอร์โทรไม่ถูกต้อง").max(10),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post("/auth/login", data)
      localStorage.setItem("access_token", res.data.accessToken)
      setUser(res.data.user)
      toast.success("เข้าสู่ระบบสำเร็จ")
      router.push("/")
    } catch {
      toast.error("เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง")
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
          <p className="text-gray-500 text-sm mt-1">เข้าสู่ระบบเพื่อซื้อ-ขายสินค้า</p>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3 mb-4">
          {/* LINE */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/auth/line`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-[#06C755] hover:bg-[#05a847] text-white font-semibold rounded-xl transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M19.365 9.863c.349 0 .63.285.63.63v.734c0 .349-.281.63-.63.63H17.61v.857h1.755c.349 0 .63.285.63.63v.734c0 .349-.281.63-.63.63H16.5a.631.631 0 0 1-.63-.63v-4.01c0-.349.281-.63.63-.63h2.865zm-6.796 0c.349 0 .63.285.63.63v4.009c0 .35-.281.63-.63.63a.631.631 0 0 1-.63-.63V10.493a.631.631 0 0 1 .63-.63zm-2.084 0c.349 0 .63.285.63.63v2.127l-2.072-2.53a.63.63 0 0 0-.494-.227.631.631 0 0 0-.63.63v4.009c0 .35.281.63.63.63.35 0 .63-.28.63-.63v-2.133l2.072 2.536c.12.148.3.227.494.227a.63.63 0 0 0 .63-.63V10.493a.631.631 0 0 0-.63-.63zm-3.741 0a.631.631 0 0 0-.63.63v4.009c0 .35.28.63.63.63.348 0 .63-.28.63-.63V10.493a.631.631 0 0 0-.63-.63zM12 2C6.477 2 2 6.169 2 11.099c0 4.278 2.842 7.885 6.82 9.227.283.104.472.374.472.67 0 .08-.013.158-.04.233l-.464 1.698c-.075.274.032.552.284.706.253.154.574.147.822-.016C13.58 21.26 22 15.67 22 11.099 22 6.169 17.523 2 12 2z"/>
            </svg>
            เข้าสู่ระบบด้วย LINE
          </a>

          {/* Google */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </a>

          {/* Facebook */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/auth/facebook`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold rounded-xl transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            เข้าสู่ระบบด้วย Facebook
          </a>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-gray-50 px-2">หรือ</span>
          </div>
        </div>

        {/* Phone/Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("phone")} type="tel" placeholder="0812345678" className="input pl-9" />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">รหัสผ่าน</label>
              <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••" className="input pl-9 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  )
}
