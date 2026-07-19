"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Wallet, Banknote } from "lucide-react"
import { MainNav } from "@/components/layout/MainNav"
import { api } from "@/lib/api"

interface WithdrawalRequest {
  id: string
  amount: string
  bankName: string
  accountName: string
  accountNumber: string
  status: "pending" | "approved" | "rejected" | "paid"
  createdAt: string
}

const STATUS_LABEL: Record<WithdrawalRequest["status"], string> = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
  paid: "โอนแล้ว",
}

const STATUS_COLOR: Record<WithdrawalRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-blue-50 text-blue-600",
  rejected: "bg-red-50 text-red-600",
  paid: "bg-green-50 text-green-600",
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

export default function WithdrawalsPage() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [amount, setAmount] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")

  async function loadData(id: string) {
    setLoading(true)
    try {
      const [b, h] = await Promise.all([
        api.get(`/withdrawals/balance?shopId=${id}`),
        api.get(`/withdrawals/mine?shopId=${id}`),
      ])
      setBalance(b.data.data.balance)
      setHistory(h.data.data || [])
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get("/auth/me/shop")
      .then(r => {
        const id = r.data.data.id
        setShopId(id)
        loadData(id)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shopId) return
    const amt = Number(amount)
    if (!amt || amt <= 0) return toast.error("กรอกจำนวนเงินให้ถูกต้อง")
    if (balance != null && amt > balance) return toast.error("ยอดคงเหลือไม่พอ")
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) return toast.error("กรอกข้อมูลบัญชีให้ครบ")

    setSubmitting(true)
    try {
      await api.post("/withdrawals", { shopId, amount: amt, bankName, accountName, accountNumber })
      toast.success("ส่งคำขอถอนเงินแล้ว รอตรวจสอบ")
      setAmount("")
      loadData(shopId)
    } catch (err: any) {
      toast.error(err.response?.data?.error || "ส่งคำขอไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">ถอนเงิน</h1>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลด...</div>
        ) : !shopId ? (
          <div className="text-center py-20 text-gray-400">ยังไม่มีร้านค้า</div>
        ) : (
          <div className="space-y-6">
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 flex-shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm text-gray-500">ยอดคงเหลือที่ถอนได้</div>
                <div className="text-2xl font-bold text-gray-900">{fmt(balance ?? 0)}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-4">
              <h2 className="font-semibold text-gray-800">ขอถอนเงิน</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                <input
                  type="number" min="1" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input" placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ธนาคาร</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)} className="input" placeholder="กสิกรไทย" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อบัญชี</label>
                  <input value={accountName} onChange={e => setAccountName(e.target.value)} className="input" placeholder="ชื่อ-นามสกุล" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่บัญชี</label>
                  <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="input" placeholder="xxx-x-xxxxx-x" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? "กำลังส่ง..." : "ส่งคำขอถอนเงิน"}
              </button>
            </form>

            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-gray-500" /> ประวัติการถอนเงิน
              </h2>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีประวัติการถอนเงิน</p>
              ) : (
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="font-medium text-gray-900">{fmt(Number(h.amount))}</div>
                        <div className="text-xs text-gray-400">{h.bankName} · {h.accountName} · {new Date(h.createdAt).toLocaleDateString("th-TH")}</div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[h.status]}`}>
                        {STATUS_LABEL[h.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
