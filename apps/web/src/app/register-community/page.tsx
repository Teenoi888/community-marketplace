"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { MainNav } from "@/components/layout/MainNav"
import { api } from "@/lib/api"
import { Upload, CheckCircle, ChevronDown } from "lucide-react"
import Image from "next/image"

const PROVINCES = ["กรุงเทพมหานคร","เชียงใหม่","เชียงราย","ลำพูน","ลำปาง","นครราชสีมา","ขอนแก่น","อุดรธานี","นครสวรรค์","พิษณุโลก","ระยอง","ชลบุรี","สุราษฎร์ธานี","นครศรีธรรมราช","สงขลา","ภูเก็ต","กระบี่"]

const schema = z.object({
  name: z.string().min(3, "ชื่อต้องมีอย่างน้อย 3 ตัวอักษร"),
  province: z.string().min(1, "กรุณาเลือกจังหวัด"),
  district: z.string().min(2, "กรุณากรอกอำเภอ"),
  subdistrict: z.string().min(2, "กรุณากรอกตำบล"),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const PLANS = [
  { id: "free", name: "Free", price: "฿0/เดือน", features: ["สินค้า 20 ชิ้น", "1 ผู้ดูแล", "หน้าร้านพื้นฐาน"] },
  { id: "community", name: "Community", price: "฿299/เดือน", features: ["สินค้าไม่จำกัด", "5 ผู้ดูแล", "Analytics", "แจ้งเตือน Line"] },
  { id: "pro", name: "Pro", price: "฿799/เดือน", features: ["ทุกอย่างใน Community", "Line Bot ครบระบบ", "LIFF App", "รายงานรายได้"] },
]

export default function RegisterCommunityPage() {
  const router = useRouter()
  const [plan, setPlan] = useState("free")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function uploadImage(file: File, folder: string): Promise<string | undefined> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)
    const r = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
    return r.data.data.url
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      let logoUrl: string | undefined
      let bannerUrl: string | undefined

      if (logoFile) {
        try { logoUrl = await uploadImage(logoFile, "logos") }
        catch { toast.error("อัปโหลดโลโก้ไม่สำเร็จ — จะใช้ตัวอักษรแทน") }
      }
      if (bannerFile) {
        try { bannerUrl = await uploadImage(bannerFile, "banners") }
        catch { toast.error("อัปโหลด banner ไม่สำเร็จ — จะใช้สีพื้นแทน") }
      }

      await api.post("/communities", { ...data, plan, logoUrl, bannerUrl })
      setDone(true)
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <main>
        <MainNav />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">สร้างชุมชนสำเร็จ! 🎉</h1>
          <p className="text-gray-500 mb-6">ร้านค้าของคุณพร้อมใช้งานแล้ว เริ่มเพิ่มสินค้าได้เลย</p>
          <button onClick={() => router.push("/dashboard")} className="btn-primary w-full py-3">
            ไปหน้าจัดการร้าน
          </button>
        </div>
      </main>
    )
  }

  return (
    <main>
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🏘️ ลงทะเบียนชุมชน</h1>
        <p className="text-gray-500 mb-8">เปิดร้านค้าออนไลน์ให้ชุมชนของคุณ ฟรี ไม่มี GP</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Banner + Logo upload */}
          <div className="card space-y-5">
            <h2 className="font-semibold text-gray-800">รูปภาพชุมชน</h2>

            {/* Banner */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">รูป Banner (แถบด้านบน)</p>
              <label className="cursor-pointer group block">
                <div className="relative w-full h-36 rounded-xl border-2 border-dashed border-gray-300 group-hover:border-primary-400 bg-gray-50 overflow-hidden transition-colors flex items-center justify-center">
                  {bannerPreview
                    ? <Image src={bannerPreview} alt="" fill className="object-cover" />
                    : <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary-400 mx-auto mb-1" />
                        <p className="text-sm text-gray-400">อัปโหลด Banner (แนะนำ 1200×400px)</p>
                        <p className="text-xs text-gray-300">PNG, JPG ไม่เกิน 5MB</p>
                      </div>
                  }
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) { toast.error("Banner ต้องไม่เกิน 5MB"); e.target.value = ""; return }
                    setBannerFile(file)
                    setBannerPreview(URL.createObjectURL(file))
                  }
                }} />
              </label>
            </div>

            {/* Logo */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">โลโก้ชุมชน (รูปวงกลม/สี่เหลี่ยม)</p>
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 group-hover:border-primary-400 flex items-center justify-center bg-gray-50 overflow-hidden transition-colors">
                  {logoPreview
                    ? <Image src={logoPreview} alt="" width={96} height={96} className="object-cover w-full h-full" />
                    : <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary-400" />
                  }
                </div>
                <div>
                  <p className="font-medium text-gray-700">อัปโหลดโลโก้</p>
                  <p className="text-sm text-gray-400">PNG, JPG ไม่เกิน 2MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) { toast.error("โลโก้ต้องไม่เกิน 2MB"); e.target.value = ""; return }
                    setLogoFile(file)
                    setLogoPreview(URL.createObjectURL(file))
                  }
                }} />
              </label>
            </div>
          </div>

          {/* Community info */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">ข้อมูลชุมชน</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อชุมชน/กลุ่ม *</label>
              <input {...register("name")} className="input" placeholder="เช่น กลุ่มเกษตรอินทรีย์ตำบลหนองแก" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด *</label>
                <div className="relative">
                  <select {...register("province")} className="input appearance-none pr-9">
                    <option value="">เลือกจังหวัด</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อำเภอ *</label>
                <input {...register("district")} className="input" placeholder="เมือง" />
                {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ตำบล *</label>
                <input {...register("subdistrict")} className="input" placeholder="ตำบลหนองแก" />
                {errors.subdistrict && <p className="text-red-500 text-xs mt-1">{errors.subdistrict.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดชุมชน</label>
              <textarea {...register("description")} className="input" rows={3} placeholder="เล่าเกี่ยวกับชุมชนของคุณ สินค้า และจุดเด่น..." />
            </div>
          </div>

          {/* Plan */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">เลือกแพ็กเกจ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLANS.map((p) => (
                <button type="button" key={p.id} onClick={() => setPlan(p.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    plan === p.id ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-bold text-gray-900">{p.name}</div>
                  <div className={`font-semibold text-sm mt-0.5 ${plan === p.id ? "text-primary-600" : "text-gray-500"}`}>{p.price}</div>
                  <ul className="mt-3 space-y-1">
                    {p.features.map(f => (
                      <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="text-green-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading ? "กำลังสร้างชุมชน..." : "สร้างชุมชน — เริ่มขายได้เลย!"}
          </button>
        </form>
      </div>
    </main>
  )
}
