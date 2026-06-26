"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Upload, X, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const CATEGORIES = [
  { id: "fresh_produce", label: "ผักผลไม้สด" },
  { id: "processed_food", label: "อาหารแปรรูป" },
  { id: "agriculture", label: "สินค้าเกษตร" },
  { id: "seafood", label: "อาหารทะเล" },
  { id: "herb", label: "สมุนไพร" },
  { id: "handicraft", label: "งานฝีมือ" },
  { id: "beverage", label: "เครื่องดื่ม" },
  { id: "otop", label: "OTOP" },
]

const schema = z.object({
  name: z.string().min(2, "ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร"),
  description: z.string().optional(),
  price: z.number({ invalid_type_error: "กรอกราคาเป็นตัวเลข" }).positive("ราคาต้องมากกว่า 0"),
  stock: z.number({ invalid_type_error: "กรอกจำนวนเป็นตัวเลข" }).int().min(0),
  category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
})

type FormData = z.infer<typeof schema>

export default function NewProductPage() {
  const router = useRouter()
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stock: 1 },
  })

  function addImages(files: FileList | null) {
    if (!files) return
    const newImgs = Array.from(files).slice(0, 5 - images.length).map(file => ({
      file, preview: URL.createObjectURL(file)
    }))
    setImages(prev => [...prev, ...newImgs])
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      // Upload images first
      const imageUrls: string[] = []
      for (const img of images) {
        const fd = new FormData()
        fd.append("file", img.file)
        fd.append("folder", "products")
        const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
        imageUrls.push(r.data.data.url)
      }

      // Create product (shopId comes from user's shop)
      const meRes = await api.get("/auth/me")
      const shopsRes = await api.get(`/products?mine=true&limit=1`)
      // In real app, get shopId from user's shop
      const shopId = meRes.data.data?.shopId || "default-shop-id"

      await api.post("/products", {
        ...data,
        shopId,
        images: imageUrls,
      })

      toast.success("เพิ่มสินค้าสำเร็จ!")
      router.push("/seller/products")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/seller/products" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">เพิ่มสินค้าใหม่</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Image upload */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">รูปภาพสินค้า (สูงสุด 5 รูป)</h2>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative w-24 h-24">
                  <Image src={img.preview} alt="" fill className="object-cover rounded-xl" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400">เพิ่มรูป</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          {/* Product info */}
          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า *</label>
              <input {...register("name")} className="input" placeholder="เช่น ข้าวไรซ์เบอร์รี่อินทรีย์ 1 กก." />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดสินค้า</label>
              <textarea {...register("description")} className="input" rows={3}
                placeholder="บอกเล่าเกี่ยวกับสินค้า วิธีปลูก คุณสมบัติ ฯลฯ" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ราคา (บาท) *</label>
                <input {...register("price", { valueAsNumber: true })} type="number" min="1" step="0.01" className="input" placeholder="150" />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนสต็อก *</label>
                <input {...register("stock", { valueAsNumber: true })} type="number" min="0" className="input" placeholder="50" />
                {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ *</label>
              <select {...register("category")} className="input">
                <option value="">เลือกหมวดหมู่</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading ? "กำลังบันทึก..." : "บันทึกสินค้า"}
          </button>
        </form>
      </div>
    </div>
  )
}
