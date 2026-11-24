"use client"
import { useCallback, useEffect, useState } from "react"
import { Mail, MessageCircle, RefreshCw, AlertTriangle, Eye, X } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

type EmailMode = "live" | "redirect" | "capture"

interface Settings {
  emailMode: EmailMode
  redirectTo: string | null
  lineEnabled: boolean
  environment: string
}

interface OutboxItem {
  id: string
  channel: "email" | "line"
  status: "sent" | "redirected" | "captured" | "failed"
  originalTo: string
  deliveredTo: string | null
  subject: string
  html: string | null
  error: string | null
  createdAt: string
}

const MODES: { value: EmailMode; title: string; desc: string }[] = [
  { value: "live", title: "ส่งจริง", desc: "ส่งอีเมลถึงผู้ใช้ตามปกติ (ใช้บน production)" },
  { value: "redirect", title: "ส่งไปอีเมลทดสอบแทน", desc: "ทุกอีเมลจะถูกส่งไปที่อีเมลทดสอบด้านล่างเท่านั้น ไม่ถึงผู้ใช้จริง" },
  { value: "capture", title: "ไม่ส่งเลย (เก็บไว้ดูในระบบ)", desc: "ไม่ส่งออกไปไหน เก็บไว้ในตารางด้านล่าง — ดูรหัส OTP ได้จากที่นี่" },
]

const STATUS_STYLE: Record<OutboxItem["status"], { label: string; cls: string }> = {
  sent: { label: "ส่งจริง", cls: "bg-green-50 text-green-700" },
  redirected: { label: "ส่งไปอีเมลทดสอบ", cls: "bg-blue-50 text-blue-700" },
  captured: { label: "เก็บไว้ ไม่ได้ส่ง", cls: "bg-gray-100 text-gray-600" },
  failed: { label: "ส่งไม่สำเร็จ", cls: "bg-red-50 text-red-700" },
}

function formatTime(date: string) {
  return new Date(date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "medium" })
}

export default function AdminNotificationsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [outbox, setOutbox] = useState<OutboxItem[]>([])
  const [loadingOutbox, setLoadingOutbox] = useState(true)
  const [preview, setPreview] = useState<OutboxItem | null>(null)

  const loadOutbox = useCallback(() => {
    setLoadingOutbox(true)
    api.get("/admin/email-outbox?limit=100")
      .then(r => setOutbox(r.data.data))
      .catch(() => toast.error("โหลดรายการอีเมลไม่สำเร็จ"))
      .finally(() => setLoadingOutbox(false))
  }, [])

  useEffect(() => {
    api.get("/admin/settings/notifications")
      .then(r => setSettings(r.data.data))
      .catch(() => toast.error("โหลดการตั้งค่าไม่สำเร็จ"))
    loadOutbox()
  }, [loadOutbox])

  async function save() {
    if (!settings) return
    if (settings.environment === "production" && settings.emailMode !== "live") {
      if (!confirm("นี่คือ production — ถ้าไม่ส่งจริง ผู้ใช้จะไม่ได้รับ OTP และอีเมลออเดอร์เลย ยืนยันไหม?")) return
    }
    setSaving(true)
    try {
      const r = await api.put("/admin/settings/notifications", {
        emailMode: settings.emailMode,
        redirectTo: settings.redirectTo || "",
        lineEnabled: settings.lineEnabled,
      })
      setSettings(r.data.data)
      toast.success("บันทึกแล้ว")
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "บันทึกไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="การส่งอีเมล / LINE">
      {settings && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${settings.environment === "production" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Environment: <strong>{settings.environment.toUpperCase()}</strong></span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        {!settings ? (
          <div className="h-40 animate-pulse bg-gray-50 rounded-xl" />
        ) : (
          <>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3"><Mail className="w-4 h-4" /> อีเมล</h2>
            <div className="space-y-2 mb-4">
              {MODES.map(m => (
                <label key={m.value} className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer ${settings.emailMode === m.value ? "border-primary-500 bg-primary-50" : "border-gray-100 hover:bg-gray-50"}`}>
                  <input
                    type="radio"
                    name="emailMode"
                    className="mt-1"
                    checked={settings.emailMode === m.value}
                    onChange={() => setSettings({ ...settings, emailMode: m.value })}
                  />
                  <span>
                    <span className="block font-medium text-gray-800">{m.title}</span>
                    <span className="block text-sm text-gray-500">{m.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {settings.emailMode === "redirect" && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลทดสอบปลายทาง</label>
                <input
                  type="email"
                  value={settings.redirectTo ?? ""}
                  onChange={e => setSettings({ ...settings, redirectTo: e.target.value })}
                  placeholder="qa-team@yourcompany.com"
                  className="w-full max-w-md border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            )}

            <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3"><MessageCircle className="w-4 h-4" /> LINE แจ้งเตือน</h2>
            <label className="flex items-center gap-3 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.lineEnabled}
                onChange={e => setSettings({ ...settings, lineEnabled: e.target.checked })}
              />
              <span className="text-sm text-gray-700">ส่งข้อความ LINE ถึงผู้ใช้จริง (ปิด = เก็บไว้ในตารางด้านล่างแทน)</span>
            </label>

            <button
              onClick={save}
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">อีเมล / LINE ล่าสุด ({outbox.length})</h2>
        <button onClick={loadOutbox} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> รีเฟรช
        </button>
      </div>

      {loadingOutbox ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : outbox.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12 text-gray-400">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีอีเมลหรือข้อความ LINE</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">หัวข้อ</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">ผู้รับ</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">สถานะ</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">เวลา</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {outbox.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-800">
                    <span className="mr-1">{item.channel === "line" ? "💬" : "✉️"}</span>
                    {item.subject}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.originalTo}
                    {item.deliveredTo && item.deliveredTo !== item.originalTo && (
                      <span className="block text-xs text-blue-600">→ {item.deliveredTo}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[item.status]?.cls ?? ""}`} title={item.error ?? undefined}>
                      {STATUS_STYLE[item.status]?.label ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{formatTime(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {item.html && (
                      <button onClick={() => setPreview(item)} className="text-gray-400 hover:text-gray-800" title="ดูเนื้อหา">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{preview.subject}</p>
                <p className="text-xs text-gray-500">ถึง {preview.originalTo}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-800"><X className="w-5 h-5" /></button>
            </div>
            {preview.channel === "email" ? (
              // sandbox="" blocks scripts/links inside the captured email
              <iframe sandbox="" srcDoc={preview.html ?? ""} className="w-full flex-1 min-h-[400px] rounded-b-2xl" title="email preview" />
            ) : (
              <pre className="p-5 text-xs overflow-auto">{JSON.stringify(JSON.parse(preview.html ?? "{}"), null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
