import { Store, Leaf, MapPin, Shield } from "lucide-react"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel — fills the space that used to be empty gray on desktop */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white p-12 flex-col justify-center relative overflow-hidden">
        <div className="relative max-w-md">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-6">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            ตลาดออนไลน์<br />
            <span className="text-primary-200">สำหรับชุมชนไทย</span>
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed mb-10">
            ตลาดออนไลน์ที่สร้างโดยชุมชน เพื่อชุมชน เชื่อมสินค้าท้องถิ่นไทยกับผู้ซื้อทั่วประเทศ
          </p>

          <div className="space-y-5">
            {[
              { icon: Leaf, label: "สินค้าชุมชนแท้", sub: "OTOP · Handmade · เกษตรกร" },
              { icon: MapPin, label: "77 จังหวัดทั่วไทย", sub: "ครอบคลุมทุกชุมชน" },
              { icon: Shield, label: "รายได้คืนสู่ท้องถิ่น", sub: "GP ต่ำ เงินถึงมือชาวบ้านโดยตรง" },
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

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
