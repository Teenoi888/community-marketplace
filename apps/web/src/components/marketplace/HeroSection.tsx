"use client"
import Link from "next/link"
import { ArrowRight, Shield, Zap, Users, ShoppingBag } from "lucide-react"
import { useAuthStore } from "@/lib/store/auth"

export function HeroSection() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-sm font-medium mb-4">
            <Zap className="w-3.5 h-3.5" />
            GP เพียง 0–2% เท่านั้น
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4">
            ตลาดออนไลน์<br />
            <span className="text-primary-200">สำหรับชุมชนไทย</span>
          </h1>
          <p className="text-primary-100 text-lg mb-8 leading-relaxed">
            ขายสินค้าชุมชนได้โดยตรง ไม่ผ่านตัวกลาง ไม่โดนหัก GP สูง
            รองรับ PromptPay • แจ้งเตือนผ่าน Line • iOS & Android
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              /* logged in — show orders button prominently */
              <>
                <Link href="/orders"
                  className="bg-white text-primary-700 font-bold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  ดูคำสั่งซื้อของฉัน
                </Link>
                <Link href="/#communities"
                  className="bg-primary-500/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-500/60 transition-colors">
                  ดูสินค้าชุมชน
                </Link>
              </>
            ) : (
              /* not logged in */
              <>
                <Link href="/register-community"
                  className="bg-white text-primary-700 font-bold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors flex items-center gap-2">
                  เปิดร้านชุมชนฟรี <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/#communities"
                  className="bg-primary-500/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-500/60 transition-colors">
                  ดูสินค้าชุมชน
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-primary-500/50">
          {[
            { icon: Shield, label: "GP เพียง 0–2%", sub: "vs Shopee 3–15%" },
            { icon: Users, label: "ชุมชนทั่วไทย", sub: "77 จังหวัด" },
            { icon: Zap, label: "รับเงินทันที", sub: "PromptPay / QR" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">{label}</div>
                <div className="text-primary-200 text-xs">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
