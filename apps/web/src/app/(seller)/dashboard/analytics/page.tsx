"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp, ShoppingBag, BarChart2, Award } from "lucide-react"
import { api } from "@/lib/api"

type Period = "7d" | "30d" | "3m"

interface Analytics {
  period: string
  days: number
  summary: { total_orders: number; total_revenue: number; avg_order_value: number }
  dailyRevenue: { day: string; order_count: number; revenue: number }[]
  topProducts: { product_name: string; total_qty: number; total_revenue: number }[]
  statusBreakdown: { status: string; count: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "รอชำระ",
  paid: "ชำระแล้ว",
  preparing: "กำลังเตรียม",
  shipped: "ส่งแล้ว",
  delivered: "ส่งถึง",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#f59e0b",
  paid: "#3b82f6",
  preparing: "#8b5cf6",
  shipped: "#06b6d4",
  delivered: "#10b981",
  completed: "#16a34a",
  cancelled: "#ef4444",
}

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n)
}

function fmtDay(day: string) {
  const d = new Date(day)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/** Native SVG area chart — no external deps */
function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  const W = 600, H = 180, PAD = { top: 10, right: 10, bottom: 30, left: 52 }
  const inner = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom }
  const maxRev = Math.max(...data.map(d => d.revenue), 1)
  const x = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * inner.w
  const y = (v: number) => PAD.top + inner.h - (v / maxRev) * inner.h

  const points = data.map((d, i) => `${x(i)},${y(d.revenue)}`).join(" ")
  const area = `M${x(0)},${y(0)} ` + data.map((d, i) => `L${x(i)},${y(d.revenue)}`).join(" ") +
    ` L${x(data.length - 1)},${PAD.top + inner.h} L${x(0)},${PAD.top + inner.h} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxRev * f))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
        </linearGradient>
      </defs>
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.left} x2={PAD.left + inner.w} y1={y(t)} y2={y(t)} stroke="#f0f0f0" />
          <text x={PAD.left - 4} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#rg)" />
      <polyline points={points} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => {
        const step = Math.ceil(data.length / 8)
        if (i % step !== 0 && i !== data.length - 1) return null
        return (
          <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#9ca3af">
            {fmtDay(d.day)}
          </text>
        )
      })}
    </svg>
  )
}

/** CSS bar chart for status breakdown */
function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.status} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20 flex-shrink-0 truncate">{STATUS_LABELS[d.status] ?? d.status}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-5 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: STATUS_COLORS[d.status] ?? "#9ca3af", minWidth: 28 }}
            >
              <span className="text-white text-xs font-semibold">{d.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d")
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/orders/shop/analytics?period=${period}`)
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const periods: { value: Period; label: string }[] = [
    { value: "7d", label: "7 วัน" },
    { value: "30d", label: "30 วัน" },
    { value: "3m", label: "3 เดือน" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary-600" /> Analytics
            </h1>
            <p className="text-sm text-gray-500">สรุปยอดขายและสินค้าขายดี</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {periods.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data && (
          <div className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-500">ยอดขายรวม</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{fmt(data.summary.total_revenue)}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-500">ออเดอร์ทั้งหมด</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_orders} รายการ</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-500">ยอดเฉลี่ยต่อออเดอร์</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{fmt(data.summary.avg_order_value)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">ยอดขายรายวัน</h2>
              {data.dailyRevenue.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีข้อมูลในช่วงนี้</div>
              ) : (
                <RevenueChart data={data.dailyRevenue} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">สินค้าขายดี Top 5</h2>
                {data.topProducts.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
                ) : (
                  <div className="space-y-3">
                    {data.topProducts.map((p, i) => (
                      <div key={p.product_name} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-600" : "bg-gray-300"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                          <p className="text-xs text-gray-500">ขายได้ {p.total_qty} ชิ้น</p>
                        </div>
                        <p className="text-sm font-semibold text-green-600 flex-shrink-0">{fmt(p.total_revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-4">สถานะออเดอร์</h2>
                {data.statusBreakdown.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
                ) : (
                  <StatusChart data={data.statusBreakdown} />
                )}
              </div>
            </div>

          </div>
        )}

        {!loading && !data && (
          <div className="text-center py-20 text-gray-400">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีข้อมูล — เริ่มขายสินค้าเพื่อดู Analytics</p>
          </div>
        )}

      </div>
    </div>
  )
}
