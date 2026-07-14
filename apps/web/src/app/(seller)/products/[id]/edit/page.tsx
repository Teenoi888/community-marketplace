"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Upload, X, ArrowLeft, Trash2, ChevronDown } from "lucide-react"
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

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    api.get(`/products/${id}`).then(r => {
      const p = r.data.data
      reset({
        name: p.name,
        description: p.description || "",
        price: parseFloat(p.price),
        stock: p.stock,
        category: p.category,
      })
      setExistingImages(p.images || [])
    }).catch(() => {
      toast.error("ไม่พบสินค้า")
      router.push("/products")
    })
  }, [id])

  function addImages(files: FileList | null) {
    if (!files) return
    const total = existingImages.length + newImages.length
    const newImgs = Array.from(files).slice(0, 5 - total).map(file => ({
      file, preview: URL.createObjectURL(file)
    }))
    setNewImages(prev => [...prev, ...newImgs])
  }

  function removeExisting(idx: number) {
    setExistingImages(prev => prev.filter((_, i) => i !== idx))
  }

  function removeNew(idx: number) {
    setNewImages(prev => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      // Upload new images
      const uploadedUrls: string[] = []
      for (const img of newImages) {
        try {
          const fd = new FormData()
          fd.append("file", img.file)
          const r = await api.post("/upload?folder=products", fd, {
            headers: { "Content-Type": "multipart/form-data" }
          })
          uploadedUrls.push(r.data.data.url)
        } catch {
          // skip failed uploads
        }
      }

      const images = [...existingImages, ...uploadedUrls]
      await api.patch(`/products/${id}`, { ...data, images })
      toast.success("อัปเดตสินค้าสำเร็จ!")
      router.push("/products")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("ลบสินค้านี้ใช่ไหม?")) return
    setDeleting(true)
    try {
      await api.delete(`/products/${id}`)
      toast.success("ลบสินค้าแล้ว")
      router.push("/products")
    } catch {
      toast.error("ลบไม่สำเร็จ")
    } finally {
      setDeleting(false)
    }
  }

  const totalImages = existingImages.length + newImages.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/products" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">แก้ไขสินค้า</h1>
          </div>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> ลบสินค้า
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Image upload */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">รูปภาพสินค้า (สูงสุด 5 รูป)</h2>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((url, i) => (
                <div key={`existing-${i}`} className="relative w-24 h-24">
                  <Image src={url} alt="" fill className="object-cover rounded-xl" />
                  <button type="button" onClick={() => removeExisting(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newImages.map((img, i) => (
                <div key={`new-${i}`} className="relative w-24 h-24">
                  <Image src={img.preview} alt="" fill className="object-cover rounded-xl" />
                  <button type="button" onClick={() => removeNew(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {totalImages < 5 && (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400">เพิ่มรูป</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => addImages(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          {/* Product info */}
          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า *</label>
              <input {...register("name")} className="input" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดสินค้า</label>
              <textarea {...register("description")} className="input" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ราคา (บาท) *</label>
                <input {...register("price", { valueAsNumber: true })} type="number" min="1" step="0.01" className="input" />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนสต็อก *</label>
                <input {...register("stock", { valueAsNumber: true })} type="number" min="0" className="input" />
                {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ *</label>
              <div className="relative">
                <select {...register("category")} className="input appearance-none pr-9">
                  <option value="">เลือกหมวดหมู่</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </form>
      </div>
    </div>
  )
}
