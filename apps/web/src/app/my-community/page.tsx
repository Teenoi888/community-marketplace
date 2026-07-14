"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Upload, MapPin, Package, Users, ExternalLink, Save, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { MainNav } from "@/components/layout/MainNav"
import { api } from "@/lib/api"

interface Community {
  id: string
  name: string
  slug: string
  province: string
  district: string
  subdistrict: string
  description?: string
  logoUrl?: string
  bannerUrl?: string
  memberCount: number
  plan: string
}

export default function MyCommunityPage() {
  const router = useRouter()
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Edit fields
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [district, setDistrict] = useState("")
  const [subdistrict, setSubdistrict] = useState("")

  // Image upload
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null)
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null)
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null)
  const [newBannerPreview, setNewBannerPreview] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.push("/login"); return }
    api.get("/communities/my")
      .then(res => {
        const c = res.data.data
        setCommunity(c)
        setName(c.name)
        setDescription(c.description ?? "")
        setDistrict(c.district)
        setSubdistrict(c.subdistrict)
      })
      .catch(() => router.push("/register-community"))
      .finally(() => setLoading(false))
  }, [])

  async function uploadImage(file: File, folder: string): Promise<string> {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", folder)
    const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
    return r.data.data.url
  }

  async function handleSave() {
    if (!community) return
    setSaving(true)
    try {
      let logoUrl = community.logoUrl
      let bannerUrl = community.bannerUrl

      if (newLogoFile) {
        try { logoUrl = await uploadImage(newLogoFile, "logos") }
        catch { toast.error("อัปโหลดโลโก้ไม่สำเร็จ") }
      }
      if (newBannerFile) {
        try { bannerUrl = await uploadImage(newBannerFile, "banners") }
        catch { toast.error("อัปโหลด banner ไม่สำเร็จ") }
      }

      const res = await api.patch(`/communities/${community.id}`, {
        name, description, district, subdistrict, logoUrl, bannerUrl,
      })
      setCommunity(res.data.data)
      setEditMode(false)
      setNewLogoFile(null)
      setNewLogoPreview(null)
      setNewBannerFile(null)
      setNewBannerPreview(null)
      toast.success("บันทึกข้อมูลชุมชนแล้ว")
    } catch (err: any) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <main><MainNav />
      <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>
    </main>
  )

  if (!community) return null

  const currentLogoPreview = newLogoPreview ?? community.logoUrl ?? null
  const currentBannerPreview = newBannerPreview ?? community.bannerUrl ?? null

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />

      {/* Banner */}
      <div className="relative h-52 md:h-64 bg-gradient-to-br from-primary-400 to-primary-700 overflow-hidden">
        {currentBannerPreview && (
          <Image src={currentBannerPreview} alt="" fill className="object-cover" />
        )}
        {editMode && (
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer hover:bg-black/50 transition-colors group">
            <div className="text-white text-center">
              <Upload className="w-8 h-8 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">เปลี่ยนรูป Banner</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                if (file.size > 5 * 1024 * 1024) { toast.error("Banner ต้องไม่เกิน 5MB"); return }
                setNewBannerFile(file)
                setNewBannerPreview(URL.createObjectURL(file))
              }
            }} />
          </label>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo + Header */}
        <div className="relative -mt-16 mb-6 flex items-end gap-4">
          <div className="relative w-28 h-28 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
            {currentLogoPreview
              ? <Image src={currentLogoPreview} alt={community.name} fill className="object-cover" />
              : <div className="w-full h-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-3xl">
                  {community.name.charAt(0)}
                </div>
            }
            {editMode && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer">
                <Upload className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) { toast.error("โลโก้ต้องไม่เกิน 2MB"); return }
                    setNewLogoFile(file)
                    setNewLogoPreview(URL.createObjectURL(file))
                  }
                }} />
              </label>
            )}
          </div>
          <div className="pb-1 flex-1">
            {editMode ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-bold text-gray-900 border-b-2 border-primary-400 bg-transparent outline-none w-full"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{community.name}</h1>
            )}
            <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {community.district}, {community.province}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          {editMode ? (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />{saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button onClick={() => { setEditMode(false); setNewLogoPreview(null); setNewBannerPreview(null) }} className="btn-outline">
                ยกเลิก
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditMode(true)} className="btn-primary flex items-center gap-2">
                ✏️ แก้ไขชุมชน
              </button>
              <Link href={`/communities/${community.slug}`} className="btn-outline flex items-center gap-2" target="_blank">
                <ExternalLink className="w-4 h-4" />ดูหน้าชุมชน
              </Link>
              <Link href="/dashboard" className="btn-outline flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />จัดการร้านค้า
              </Link>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4 text-primary-500" />
            <span className="font-semibold">—</span> สินค้า
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-primary-500" />
            <span className="font-semibold">{community.memberCount}</span> สมาชิก
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium uppercase">{community.plan}</span>
          </div>
        </div>

        {/* Detail / Edit form */}
        <div className="card space-y-4 mb-8">
          <h2 className="font-semibold text-gray-800">รายละเอียดชุมชน</h2>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">คำอธิบายชุมชน</label>
            {editMode ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="input w-full"
                placeholder="เล่าเกี่ยวกับชุมชนของคุณ..."
              />
            ) : (
              <p className="text-gray-700 text-sm leading-relaxed">{community.description || <span className="text-gray-400 italic">ยังไม่มีคำอธิบาย</span>}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">อำเภอ/เขต</label>
              {editMode ? (
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className="input" />
              ) : (
                <p className="text-gray-700 text-sm">{community.district}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ตำบล/แขวง</label>
              {editMode ? (
                <input value={subdistrict} onChange={(e) => setSubdistrict(e.target.value)} className="input" />
              ) : (
                <p className="text-gray-700 text-sm">{community.subdistrict}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">จังหวัด</label>
            <p className="text-gray-700 text-sm">{community.province} <span className="text-gray-400 text-xs">(ไม่สามารถเปลี่ยนได้)</span></p>
          </div>
        </div>
      </div>
    </main>
  )
}
