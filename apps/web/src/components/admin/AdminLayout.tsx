"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Tag, Users, ShieldCheck, ExternalLink, LogOut, ScrollText } from "lucide-react"
import { useAuthStore } from "@/lib/store/auth"
import { api } from "@/lib/api"

const NAV_ITEMS = [
  { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/admin/categories", label: "หมวดหมู่สินค้า", icon: Tag },
  { href: "/admin/users", label: "ผู้ใช้", icon: Users },
  { href: "/admin/activity-logs", label: "Log กิจกรรม", icon: ScrollText },
]

export function AdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  async function handleLogout() {
    try { await api.post("/auth/logout") } catch { /* ignore */ }
    logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-slate-900 text-slate-300">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-800">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight">Admin Console</p>
            <p className="text-[11px] text-slate-500 leading-tight">ตลาดชุมชน</p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4.5 h-4.5" />
            กลับสู่เว็บไซต์หลัก
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="md:hidden w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              โหมดผู้ดูแลระบบ
            </span>
            {user && (
              <span className="text-sm text-gray-600 truncate max-w-[140px]">{user.name}</span>
            )}
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 py-2 bg-slate-900 text-slate-300">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-primary-600 text-white" : "text-slate-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            )
          })}
        </nav>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
