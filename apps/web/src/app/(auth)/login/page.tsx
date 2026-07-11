"use client"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Store, Phone, Lock } from "lucide-react"
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

        {/* Line Login */}
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/auth/line`}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-[#06C755] hover:bg-[#05a847] text-white font-semibold rounded-xl transition-colors mb-4"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M19.365 9.863c.349 0 .63.285.63.63v.734c0 .349-.281.63-.63.63H17.61v.857h1.755c.349 0 .63.285.63.63v.734c0 .349-.281.63-.63.63H16.5a.631.631 0 0 1-.63-.63v-4.01c0-.349.281-.63.63-.63h2.865zm-6.796 0c.349 0 .63.285.63.63v4.009c0 .35-.281.63-.63.63a.631.631 0 0 1-.63-.63V10.493a.631.631 0 0 1 .63-.63zm-2.084 0c.349 0 .63.285.63.63v2.127l-2.072-2.53a.63.63 0 0 0-.494-.227.631.631 0 0 0-.63.63v4.009c0 .35.281.63.63.63.35 0 .63-.28.63-.63v-2.133l2.072 2.536c.12.148.3.227.494.227a.63.63 0 0 0 .63-.63V10.493a.631.631 0 0 0-.63-.63zm-3.741 0a.631.631 0 0 0-.63.63v4.009c0 .35.28.63.63.63.348 0 .63-.28.63-.63V10.493a.631.631 0 0 0-.63-.63zM12 2C6.477 2 2 6.169 2 11.099c0 4.278 2.842 7.885 6.82 9.227.283.104.472.374.472.67 0 .08-.013.158-.04.233l-.464 1.698c-.075.274.032.552.284.706.253.154.574.147.822-.016C13.58 21.26 22 15.67 22 11.099 22 6.169 17.523 2 12 2z"/>
          </svg>
          เข้าสู่ระบบด้วย LINE
        </a>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register("password")} type="password" placeholder="••••••" className="input pl-9" />
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
