"use client"
import { useEffect, useState } from "react"
import { Receipt } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface SlipRow {
  id: string
  orderId: string
  amount: string
  slipUrl: string | null
  status: "verifying" | "verified" | "failed"
  failedReason: string | null
  createdAt: string
  orderStatus: string
  orderTotal: string
  paymentExpiresAt: string | null
  buyerName: string
  buyerPhone: string | null
  sameSlipElsewhere: number
}

const FILTERS = [
  { key: "verifying", label: "รอตรวจสอบ" },
  { key: "verified", label: "อนุมัติแล้ว" },
  { key: "failed", label: "ไม่ผ่าน" },
]

export default function AdminSlipsPage() {
  const [filter, setFilter] = useState(FILTERS[0].key)
  const [rows, setRows] = useState<SlipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get(`/slips?status=${filter}`)
      .then(r => setRows(r.data.data))
      .catch(() => toast.error("โหลดรายการสลิปไม่สำเร็จ"))
      .finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  async function approve(row: SlipRow) {
    const baht = Number(row.orderTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })
    if (!window.confirm(`ยืนยันว่าตรวจสลิปแล้ว และมียอดเงิน ฿${baht} เข้าบัญชีจริง?`)) return
    await decide(row, "approve", {})
  }
  async function reject(row: SlipRow) {
    const reason = window.prompt("เหตุผลที่ไม่ผ่าน (ผู้ซื้อจะเห็น)")
    if (!reason) return
    await decide(row, "reject", { reason })
  }
  async function decide(row: SlipRow, action: "approve" | "reject", body: Record<string, string>) {
    setBusy(row.id)
    try {
      await api.post(`/slips/${row.id}/${action}`, body)
      toast.success("บันทึกแล้ว")
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "ทำรายการไม่สำเร็จ")
    } finally {
      setBusy(null)
      load()
    }
  }

  return (
    <AdminLayout title="ตรวจสลิปโอนเงิน">
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${filter === f.key ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-4">เปิดสลิปแล้วเทียบกับรายการเงินเข้าบัญชีจริงก่อนอนุมัติ ระบบไม่ได้ตรวจสลิปอัตโนมัติ ช่องทางนี้เปิดเมื่อตั้ง SLIP_PAYMENT_ENABLED=true เท่านั้น</p>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>ไม่มีรายการ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex gap-4 flex-wrap">
              {r.slipUrl && (
                <a href={r.slipUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.slipUrl} alt="สลิปโอนเงิน" className="w-28 h-40 object-cover rounded-xl border border-gray-200" />
                </a>
              )}
              <div className="flex-1 min-w-[220px]">
                <p className="font-semibold text-gray-900">฿{Number(r.orderTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })} — {r.buyerName}</p>
                <p className="text-xs text-gray-500">ออเดอร์ #{r.orderId.slice(0, 8).toUpperCase()} ({r.orderStatus}) · {r.buyerPhone ?? ""}</p>
                <p className="text-xs text-gray-500">ส่งเมื่อ {new Date(r.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</p>
                {r.sameSlipElsewhere > 0 && (
                  <p className="text-sm text-red-600 mt-2">⚠ รูปสลิปนี้ถูกใช้กับรายการอื่นอีก {r.sameSlipElsewhere} รายการ</p>
                )}
                {r.orderStatus !== "pending_payment" && r.status === "verifying" && (
                  <p className="text-sm text-amber-700 mt-2">ออเดอร์ไม่ได้รอชำระเงินแล้ว อนุมัติไม่ได้ ให้ปฏิเสธสลิปและคืนเงินนอกระบบ</p>
                )}
                {r.failedReason && <p className="text-sm text-gray-500 mt-2">เหตุผลที่ไม่ผ่าน: {r.failedReason}</p>}
                {r.status === "verifying" && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button disabled={busy === r.id || r.orderStatus !== "pending_payment"} onClick={() => approve(r)} className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm disabled:opacity-50">อนุมัติ</button>
                    <button disabled={busy === r.id} onClick={() => reject(r)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm disabled:opacity-50">ไม่ผ่าน</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
