import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MainNav } from "@/components/layout/MainNav"

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt?: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </Link>
        <div className="card space-y-8 text-gray-700 leading-relaxed">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
            {updatedAt && <p className="text-sm text-gray-400">ปรับปรุงล่าสุด: {updatedAt}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  )
}
