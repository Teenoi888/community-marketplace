"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, Plus, Star, Trash2, Check, ChevronDown, ChevronUp, Home, Briefcase } from "lucide-react"
import { MainNav } from "@/components/layout/MainNav"
import { useCartStore } from "@/lib/store/cart"
import { api } from "@/lib/api"
import { PROVINCES, getDistricts } from "@/lib/thailand-address"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SavedAddress {
  id: string
  label: string
  name: string
  phone: string
  address: string
  province: string
  district: string
  zipCode: string
  isDefault: boolean
}

interface FormState {
  label: string
  name: string
  phone: string
  address: string
  province: string
  district: string
  zipCode: string
  saveAddress: boolean
  setAsDefault: boolean
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

const LABEL_OPTIONS = ["บ้าน", "ที่ทำงาน", "อื่นๆ"]

// ─── Main ───────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const isCheckingOut = useRef(false)

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [showForm, setShowForm]             = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [submitting, setSubmitting]         = useState(false)
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  // Plain controlled form state — no react-hook-form
  const [form, setForm] = useState<FormState>({
    label: "บ้าน", name: "", phone: "", address: "",
    province: "", district: "", zipCode: "",
    saveAddress: true, setAsDefault: false,
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const districts = getDistricts(form.province)

  // Load saved addresses
  useEffect(() => {
    api.get("/addresses")
      .then(r => {
        const list: SavedAddress[] = r.data.data || []
        setSavedAddresses(list)
        const def = list.find(a => a.isDefault) ?? list[0]
        if (def) { setSelectedId(def.id); setShowForm(false) }
        else     { setSelectedId(null);  setShowForm(true) }
      })
      .catch(() => { setShowForm(true) })
      .finally(() => setLoadingAddresses(false))
  }, [])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setFormErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function onProvinceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm(prev => ({ ...prev, province: e.target.value, district: "", zipCode: "" }))
    setFormErrors(prev => ({ ...prev, province: undefined, district: undefined, zipCode: undefined }))
  }

  function onDistrictChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    const found = districts.find(d => d.name === val)
    setForm(prev => ({ ...prev, district: val, zipCode: found?.zipCode ?? "" }))
    setFormErrors(prev => ({ ...prev, district: undefined, zipCode: undefined }))
  }

  function validateForm(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name || form.name.trim().length < 2)    errs.name = "กรุณากรอกชื่อ-นามสกุล"
    if (!form.phone || form.phone.trim().length < 9)  errs.phone = "เบอร์โทรไม่ถูกต้อง"
    if (!form.address || form.address.trim().length < 5) errs.address = "กรุณากรอกที่อยู่"
    if (!form.province)                               errs.province = "กรุณาเลือกจังหวัด"
    if (!form.district)                               errs.district = "กรุณาเลือกอำเภอ/เขต"
    if (!form.zipCode || form.zipCode.length !== 5)   errs.zipCode = "รหัสไปรษณีย์ไม่ถูกต้อง"
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function setDefault(addr: SavedAddress) {
    try {
      await api.patch(`/addresses/${addr.id}`, { isDefault: true })
      setSavedAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addr.id })))
      toast.success("ตั้งเป็นที่อยู่หลักแล้ว")
    } catch { toast.error("ไม่สำเร็จ") }
  }

  async function deleteAddress(id: string) {
    setDeletingId(id)
    try {
      await api.delete(`/addresses/${id}`)
      const next = savedAddresses.filter(a => a.id !== id)
      setSavedAddresses(next)
      if (selectedId === id) {
        const def = next.find(a => a.isDefault) ?? next[0]
        if (def) setSelectedId(def.id)
        else { setSelectedId(null); setShowForm(true) }
      }
      toast.success("ลบที่อยู่แล้ว")
    } catch { toast.error("ลบไม่สำเร็จ") }
    finally { setDeletingId(null) }
  }

  async function handleCheckout() {
    if (items.length === 0) return toast.error("ตะกร้าว่างเปล่า")

    // Determine delivery address
    let deliveryAddress: Omit<FormState, "saveAddress" | "setAsDefault">

    if (selectedId && !showForm) {
      // Use selected saved address
      const addr = savedAddresses.find(a => a.id === selectedId)
      if (!addr) return toast.error("กรุณาเลือกที่อยู่")
      deliveryAddress = { label: addr.label, name: addr.name, phone: addr.phone, address: addr.address, province: addr.province, district: addr.district, zipCode: addr.zipCode }
    } else {
      // Validate new address form
      if (!validateForm()) {
        toast.error("กรุณากรอกข้อมูลให้ครบถ้วน")
        return
      }
      deliveryAddress = { label: form.label, name: form.name, phone: form.phone, address: form.address, province: form.province, district: form.district, zipCode: form.zipCode }

      // Try to save address (non-blocking — don't fail checkout if API not ready)
      if (form.saveAddress) {
        try {
          const res = await api.post("/addresses", {
            ...deliveryAddress,
            isDefault: form.setAsDefault || savedAddresses.length === 0,
          })
          const newAddr: SavedAddress = res.data.data
          setSavedAddresses(prev => {
            const updated = form.setAsDefault ? prev.map(a => ({ ...a, isDefault: false })) : prev
            return [...updated, newAddr]
          })
        } catch {
          // Silently skip — still proceed with order
        }
      }
    }

    setSubmitting(true)
    try {
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
            deliveryAddress,
          }).then(r => r.data.data)
        )
      )

      isCheckingOut.current = true
      clearCart()
      router.push(`/checkout/${orders[0].id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0 && !isCheckingOut.current) {
    router.push("/cart")
    return null
  }

  return (
    <main>
      <MainNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">ที่อยู่จัดส่ง</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT ── */}
          <div className="lg:col-span-2 space-y-4">

            {loadingAddresses ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Saved addresses */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-3">
                    {savedAddresses.map(addr => (
                      <AddressCard
                        key={addr.id}
                        addr={addr}
                        selected={selectedId === addr.id && !showForm}
                        onSelect={() => { setSelectedId(addr.id); setShowForm(false) }}
                        onSetDefault={() => setDefault(addr)}
                        onDelete={() => deleteAddress(addr.id)}
                        deleting={deletingId === addr.id}
                      />
                    ))}
                  </div>
                )}

                {/* Toggle add new */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !showForm
                    setShowForm(next)
                    if (next) setSelectedId(null)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${
                    showForm
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${showForm ? "bg-primary-500 text-white" : "bg-gray-100"}`}>
                    {showForm ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <span className="font-medium text-sm">
                    {savedAddresses.length > 0 ? "เพิ่มที่อยู่ใหม่" : "กรอกที่อยู่จัดส่ง"}
                  </span>
                  <span className="ml-auto">
                    {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {/* New address form */}
                {showForm && (
                  <div className="card space-y-4 border-2 border-primary-200">

                    {/* Label */}
                    <div className="flex gap-2 flex-wrap">
                      {LABEL_OPTIONS.map(l => (
                        <button key={l} type="button"
                          onClick={() => setField("label", l)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            form.label === l
                              ? "bg-primary-600 text-white border-primary-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-primary-400"
                          }`}
                        >
                          {l === "บ้าน" ? <Home className="w-3.5 h-3.5" /> : l === "ที่ทำงาน" ? <Briefcase className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                          {l}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                        <input
                          value={form.name}
                          onChange={e => setField("name", e.target.value)}
                          className={`input ${formErrors.name ? "border-red-400" : ""}`}
                          placeholder="สมชาย ใจดี"
                        />
                        {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ *</label>
                        <input
                          value={form.phone}
                          onChange={e => setField("phone", e.target.value)}
                          className={`input ${formErrors.phone ? "border-red-400" : ""}`}
                          placeholder="0812345678"
                          type="tel"
                        />
                        {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่ (บ้านเลขที่ ซอย ถนน) *</label>
                      <textarea
                        value={form.address}
                        onChange={e => setField("address", e.target.value)}
                        className={`input ${formErrors.address ? "border-red-400" : ""}`}
                        rows={2}
                        placeholder="123/4 ซอยสุขุมวิท 11 ถนนสุขุมวิท"
                      />
                      {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด *</label>
                        <div className="relative">
                          <select
                            value={form.province}
                            onChange={onProvinceChange}
                            className={`input appearance-none pr-9 ${formErrors.province ? "border-red-400" : ""}`}
                          >
                            <option value="">-- เลือกจังหวัด --</option>
                            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {formErrors.province && <p className="text-red-500 text-xs mt-1">{formErrors.province}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">อำเภอ/เขต *</label>
                        <div className="relative">
                          <select
                            value={form.district}
                            onChange={onDistrictChange}
                            className={`input appearance-none pr-9 ${formErrors.district ? "border-red-400" : ""}`}
                            disabled={!form.province}
                          >
                            <option value="">{form.province ? "-- เลือกอำเภอ/เขต --" : "เลือกจังหวัดก่อน"}</option>
                            {districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {formErrors.district && <p className="text-red-500 text-xs mt-1">{formErrors.district}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสไปรษณีย์ *</label>
                        <input
                          value={form.zipCode}
                          readOnly
                          className="input bg-gray-50 text-gray-600 cursor-default"
                          placeholder="กรอกอัตโนมัติ"
                        />
                        {formErrors.zipCode && <p className="text-red-500 text-xs mt-1">{formErrors.zipCode}</p>}
                      </div>
                    </div>

                    {/* Save options */}
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.saveAddress}
                          onChange={e => setField("saveAddress", e.target.checked)}
                          className="w-4 h-4 rounded accent-primary-600"
                        />
                        <span className="text-sm text-gray-700">บันทึกที่อยู่นี้ไว้ใช้ครั้งหน้า</span>
                      </label>
                      {form.saveAddress && (
                        <label className="flex items-center gap-2 cursor-pointer ml-6">
                          <input
                            type="checkbox"
                            checked={form.setAsDefault}
                            onChange={e => setField("setAsDefault", e.target.checked)}
                            className="w-4 h-4 rounded accent-primary-600"
                          />
                          <span className="text-sm text-gray-600">ตั้งเป็นที่อยู่หลัก</span>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || loadingAddresses}
              className="btn-primary w-full py-4 text-base disabled:opacity-60"
            >
              {submitting ? "กำลังสร้างออเดอร์..." : `สั่งซื้อ (${formatPrice(total())})`}
            </button>
          </div>

          {/* ── RIGHT: Order summary ── */}
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

// ─── Address Card ───────────────────────────────────────────────────────────────
function AddressCard({ addr, selected, onSelect, onSetDefault, onDelete, deleting }: {
  addr: SavedAddress
  selected: boolean
  onSelect: () => void
  onSetDefault: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
        selected ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:border-primary-300"
      }`}
    >
      <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? "border-primary-500 bg-primary-500" : "border-gray-300"
      }`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>

      <div className="flex items-center gap-2 mb-2">
        {addr.label === "บ้าน" ? <Home className="w-4 h-4 text-primary-500" /> :
         addr.label === "ที่ทำงาน" ? <Briefcase className="w-4 h-4 text-primary-500" /> :
         <MapPin className="w-4 h-4 text-primary-500" />}
        <span className="font-semibold text-gray-800 text-sm">{addr.label}</span>
        {addr.isDefault && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            <Star className="w-2.5 h-2.5 fill-amber-400" /> หลัก
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-gray-900">{addr.name} · {addr.phone}</p>
      <p className="text-sm text-gray-500 mt-0.5 pr-6">{addr.address}, {addr.district}, {addr.province} {addr.zipCode}</p>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        {!addr.isDefault && (
          <button type="button" onClick={e => { e.stopPropagation(); onSetDefault() }}
            className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1 transition-colors">
            <Star className="w-3.5 h-3.5" /> ตั้งเป็นหลัก
          </button>
        )}
        <button type="button" onClick={e => { e.stopPropagation(); onDelete() }} disabled={deleting}
          className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto transition-colors disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" /> {deleting ? "กำลังลบ..." : "ลบ"}
        </button>
      </div>
    </div>
  )
}
