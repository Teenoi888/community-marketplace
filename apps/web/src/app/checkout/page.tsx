"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { MainNav } from "@/components/layout/MainNav"
import { useCartStore } from "@/lib/store/cart"
import { api } from "@/lib/api"

const addressSchema = z.object({
  name: z.string().min(2, "กรุณากรอกชื่อ"),
  phone: z.string().min(9, "เบอร์โทรไม่ถูกต้อง"),
  address: z.string().min(5, "กรุณากรอกที่อยู่"),
  district: z.string().min(2, "กรุณากรอกอำเภอ"),
  province: z.string().min(2, "กรุณากรอกจังหวัด"),
  zipCode: z.string().length(5, "รหัสไปรษณีย์ 5 หลัก"),
})

type AddressForm = z.infer<typeof addressSchema>

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
  })

  async function onSubmit(address: AddressForm) {
    if (items.length === 0) return toast.error("ตะกร้าว่างเปล่า")
    setLoading(true)
    try {
      // Group by shop and create one order per shop
      const byShop = items.reduce((acc, item) => {
        if (!acc[item.shopId]) acc[item.shopId] = []
        acc[item.shopId].push(item)
        return acc
      }, {} as Record<string, typeof items>)

      const orders = await Promise.all(
        Object.entries(byShop).map(([shopId, shopItems]) =>
          api.post("/orders", {
            shopId,
            items: shopItems.map(i => ({ productId: i.product.id, quantity: i.quantity })),
            deliveryAddress: address,
          }).then(r => r.data.data)
        )
      )

      clearCart()
      // Redirect to payment page for first order
      router.push(`/checkout/${orders[0].id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  return (
    <main>
      <MainNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📝 กรอกที่อยู่จัดส่ง</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4">ข้อมูลผู้รับสินค้า</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input {...register("name")} className="input" placeholder="สมชาย ใจดี" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <input {...register("phone")} className="input" placeholder="0812345678" type="tel" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่ *</label>
                <textarea {...register("address")} className="input" rows={2} placeholder="บ้านเลขที่ ซอย ถนน" />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อำเภอ/เขต *</label>
                  <input {...register("district")} className="input" placeholder="เมือง" />
                  {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด *</label>
                  <input {...register("province")} className="input" placeholder="เชียงใหม่" />
                  {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสไปรษณีย์ *</label>
                  <input {...register("zipCode")} className="input" placeholder="50000" maxLength={5} />
                  {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode.message}</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
              {loading ? "กำลังสร้างออเดอร์..." : `สั่งซื้อ (${formatPrice(total())})`}
            </button>
          </form>

          {/* Order summary */}
          <div className="card h-fit">
            <h3 className="font-bold text-gray-900 mb-3">รายการสั่งซื้อ</h3>
            <div className="space-y-2 mb-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate flex-1 mr-2">{product.name} ×{quantity}</span>
                  <span className="font-medium text-gray-900 flex-shrink-0">{formatPrice(product.price * quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold">
              <span>รวม</span>
              <span className="text-primary-600">{formatPrice(total())}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
