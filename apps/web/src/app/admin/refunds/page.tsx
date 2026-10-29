"use client"
import { useEffect, useState } from "react"
import { Undo2 } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface RefundRow {
  id: string
  orderId: string
  amount: string
  reason: string
  status: "requested" | "approved" | "rejected" | "refunded"
  adminNote: string | null
  providerRefundRef: string | null
  createdAt: string
  orderStatus: string
  buyerName: string
  buyerPhone: string | null
  method: string
  provider: string | null
  paymentRef: string | null
}

const STATUS_LABELS: Record<string, string> = {
  requested: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว (รอโอนคืน)",
  rejected: "ไม่อนุมัติ",
  refunded: "คืนเงินแล้ว",
}
const FILTERS = [
  { key: "requested,approved", label: "ต้องดำเนินการ" },
  { key: "refunded", label: "คืนเงินแล้ว" },
  { key: "rejected", label: "ไม่อนุมัติ" },
]

export default function AdminRefundsPage() {
  const [filter, setFilter] = useState(FILTERS[0].key)
  const [rows, setRows] = useState<RefundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get(`/refunds/admin?status=${filter}`)
      .then(r => setRows(r.data.data))
      .catch(() => toast.error("โหลดรายการคืนเงินไม่สำเร็จ"))
      .finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  async function act(row: RefundRow, action: "approve" | "reject" | "complete") {
    let body: Record<string, string> = {}
    if (action === "reject") {
      const note = window.prompt("เหตุผลที่ไม่อนุมัติ (ผู้ซื้อจะเห็น)")
      if (note === null) return
      body = { note }
    }
    if (action === "complete") {
      const ref = window.prompt(`โอนเงินคืน ฿${Number(row.amount).toLocaleString("th-TH")} ให้ผู้ซื้อแล้ว?\nใส่เลขอ้างอิงการคืนเงิน (จากหน้า gateway หรือสลิปโอน)`)
      if (!ref) return
      body = { providerRefundRef: ref }
    }
    if (action === "approve" && !window.confirm("อนุมัติคำขอคืนเงินนี้?")) return
    setBusy(row.id)
    try {
      await api.post(`/refunds/admin/${row.id}/${action}`, body)
      toast.success("บันทึกแล้ว")
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "ทำรายการไม่สำเร็จ")
      load()
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminLayout title="คำขอคืนเงิน">
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${filter === f.key ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-4">ระบบนี้ไม่ได้โอนเงินให้ — โอนคืนผ่านหน้า gateway หรือธนาคารก่อน แล้วค่อยกดปุ่มบันทึกว่าคืนเงินแล้ว พร้อมเลขอ้างอิง</p>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <Undo2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>ไม่มีรายการ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">฿{Number(r.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} — {r.buyerName}</p>
                  <p className="text-xs text-gray-500">ออเดอร์ #{r.orderId.slice(0, 8).toUpperCase()} ({r.orderStatus}) · {r.provider ?? r.method} · อ้างอิง {r.paymentRef ?? "—"}</p>
                  <p className="text-xs text-gray-500">{r.buyerPhone ?? ""} · {new Date(r.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[r.status]}</span>
              </div>
              <p className="text-sm text-gray-700 mt-3">เหตุผล: {r.reason}</p>
              {r.adminNote && <p className="text-sm text-gray-500">หมายเหตุแอดมิน: {r.adminNote}</p>}
              {r.providerRefundRef && <p className="text-sm text-gray-500">เลขอ้างอิงการคืนเงิน: {r.providerRefundRef}</p>}
              <div className="flex gap-2 mt-4 flex-wrap">
                {r.status === "requested" && (
                  <button disabled={busy === r.id} onClick={() => act(r, "approve")} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm disabled:opacity-50">อนุมัติ</button>
                )}
                {r.status === "approved" && (
                  <button disabled={busy === r.id} onClick={() => act(r, "complete")} className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm disabled:opacity-50">บันทึกว่าคืนเงินแล้ว</button>
                )}
                {(r.status === "requested" || r.status === "approved") && (
                  <button disabled={busy === r.id} onClick={() => act(r, "reject")} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm disabled:opacity-50">ไม่อนุมัติ</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
