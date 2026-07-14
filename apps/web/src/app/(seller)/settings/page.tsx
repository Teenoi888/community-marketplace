"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save, ExternalLink } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { MainNav } from "@/components/layout/MainNav"

export default function ShopSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    lineNotifyToken: "",
    lineGroupUrl: "",
  })

  useEffect(() => {
    api.get("/shops/my")
      .then(r => {
        const d = r.data.data
        setForm({
          name: d.name || "",
          description: d.description || "",
          lineNotifyToken: d.line_notify_token || "",
          lineGroupUrl: d.line_group_url || "",
        })
      })
      .catch(() => toast.error("โหลดข้อมูลร้านไม่ได้"))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api.patch("/shops/my", {
        name: form.name,
        description: form.description,
        lineNotifyToken: form.lineNotifyToken || undefined,
        lineGroupUrl: form.lineGroupUrl || undefined,
      })
      toast.success("บันทึกแล้ว!")
    } catch {
      toast.error("เกิดข้อผิดพลาด")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50"><MainNav />
      <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">ตั้งค่าร้านค้า</h1>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-800">ข้อมูลร้าน</h2>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">ชื่อร้าน</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input w-full" />
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">คำอธิบายร้าน</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="input w-full resize-none" />
          </div>
        </div>

        {/* LINE Group delivery */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-green-600">📲</span> ตั้งค่าส่งผ่านชุมชน (LINE)
            </h2>
            <p className="text-xs text-gray-400 mt-1">เมื่อเลือกขนส่ง "ส่งผ่านชุมชน (LINE)" ระบบจะส่งรายละเอียดออเดอร์เข้ากลุ่ม LINE ไรเดอร์ของคุณอัตโนมัติ</p>
          </div>

          <div>
            <label className="text-sm text-gray-500 mb-1 block">
              LINE Notify Token
              <a href="https://notify-bot.line.me/my/" target="_blank" rel="noopener noreferrer"
                className="ml-2 text-xs text-primary-600 hover:underline inline-flex items-center gap-0.5">
                ขอ Token ที่นี่ <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              value={form.lineNotifyToken}
              onChange={e => setForm(f => ({ ...f, lineNotifyToken: e.target.value }))}
              placeholder="วาง Token จาก LINE Notify..."
              className="input w-full font-mono text-sm"
              type="password"
            />
            <p className="text-xs text-gray-400 mt-1">
              วิธีขอ Token: ไปที่ notify-bot.line.me → Generate token → เลือกกลุ่มไรเดอร์ → คัดลอก token มาวางที่นี่
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-500 mb-1 block">ลิงก์เชิญกลุ่ม LINE (ไม่บังคับ)</label>
            <input
              value={form.lineGroupUrl}
              onChange={e => setForm(f => ({ ...f, lineGroupUrl: e.target.value }))}
              placeholder="https://line.me/g/..."
              className="input w-full"
            />
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base">
          <Save className="w-5 h-5" />
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </div>
    </main>
  )
}
