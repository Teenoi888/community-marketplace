"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart, Search, Bell, Menu, Store, User, LogOut, ChevronDown, X, Home, Package, MessageSquare, ShoppingBag, Radio, Heart } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import { useAuthStore } from "@/lib/store/auth"
import { useCartStore } from "@/lib/store/cart"
import { useWishlistStore } from "@/lib/store/wishlist"
import { api } from "@/lib/api"
import { useInactivityLogout } from "@/lib/hooks/useInactivityLogout"
import { useNotifications } from "@/lib/hooks/useNotifications"
import { useUnreadChat } from "@/lib/hooks/useUnreadChat"

export function MainNav() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hasCommunity, setHasCommunity] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, setUser, logout } = useAuthStore()
  const cartCount = useCartStore((s) => s.itemCount())
  const resetWishlist = useWishlistStore((s) => s.reset)
  const [mounted, setMounted] = useState(false)

  const handleLogout = useCallback(async () => {
    try { await api.post("/auth/logout") } catch { /* ignore */ }
    logout()
    resetWishlist()
    setDropdownOpen(false)
    setMobileOpen(false)
    router.push("/login")
  }, [logout, resetWishlist, router])

  useInactivityLogout()
  const { unreadCount } = useNotifications()
  const { unreadCount: unreadChatCount } = useUnreadChat()

  // Restore session
  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem("access_token")
    if (token && !user) {
      api.get("/auth/me").then(res => {
        if (res.data?.data) setUser(res.data.data)
      }).catch(() => localStorage.removeItem("access_token"))
    }
  }, [])

  // Check community
  useEffect(() => {
    if (user) {
      api.get("/communities/my").then(() => setHasCommunity(true)).catch(() => setHasCommunity(false))
    } else {
      setHasCommunity(false)
    }
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Close mobile menu on route change / resize
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  function closeMobile() { setMobileOpen(false) }

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 hidden sm:block">ตลาดชุมชน</span>
            </Link>

            {/* Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
              }}
              className="flex-1"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="ค้นหาสินค้า ชุมชน จังหวัด..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
                />
              </div>
            </form>

            {/* Desktop actions */}
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/live" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <Radio className="w-4 h-4" /> ไลฟ์สด
              </Link>
              {user && (
                <Link href="/wishlist" className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="รายการโปรด">
                  <Heart className="w-5 h-5" />
                </Link>
              )}
              <Link href="/cart" className="relative p-2 text-gray-600 hover:text-gray-900">
                <ShoppingCart className="w-5 h-5" />
                {mounted && cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>
                )}
              </Link>
              {user && (
                <Link href="/chat" className="relative p-2 text-gray-600 hover:text-gray-900">
                  <MessageSquare className="w-5 h-5" />
                  {mounted && unreadChatCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadChatCount > 99 ? "99+" : unreadChatCount}</span>
                  )}
                </Link>
              )}
              <Link href="/notifications" className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                {mounted && unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </Link>

              {user ? (
                <>
                  <div ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700"
                    >
                      <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="max-w-[100px] truncate">{user.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                        <Link href="/orders" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <ShoppingBag className="w-4 h-4" /> คำสั่งซื้อของฉัน
                        </Link>
                        <Link href="/wishlist" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Heart className="w-4 h-4 text-red-400" /> รายการโปรด
                        </Link>
                        <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Store className="w-4 h-4" /> จัดการร้านค้า
                        </Link>
                        {hasCommunity && (
                          <Link href="/my-community" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <Home className="w-4 h-4 text-primary-600" /> ชุมชนของฉัน
                          </Link>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut className="w-4 h-4" /> ออกจากระบบ
                        </button>
                      </div>
                    )}
                  </div>
                  <Link
                    href={hasCommunity ? "/my-community" : "/register-community"}
                    className="btn-outline text-sm"
                  >
                    {hasCommunity ? "ชุมชนของฉัน" : "เปิดร้านชุมชน"}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-primary text-sm">เข้าสู่ระบบ</Link>
                  <Link href="/register" className="btn-outline text-sm">สมัครสมาชิก</Link>
                </>
              )}
            </div>

            {/* Mobile: Cart + Hamburger */}
            <div className="flex sm:hidden items-center gap-2">
              <Link href="/cart" className="relative p-2 text-gray-600">
                <ShoppingCart className="w-5 h-5" />
                {mounted && cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                aria-label="เปิดเมนู"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] sm:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={closeMobile} />

          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900">ตลาดชุมชน</span>
              </div>
              <button onClick={closeMobile} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info or Login */}
            {user ? (
              <div className="px-5 py-4 bg-primary-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email || user.phone}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 border-b border-gray-100 space-y-2">
                <Link href="/login" onClick={closeMobile}
                  className="block w-full text-center btn-primary py-3 text-sm font-semibold">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" onClick={closeMobile}
                  className="block w-full text-center py-3 text-sm font-semibold border-2 border-primary-600 text-primary-600 rounded-xl hover:bg-primary-50 transition-colors">
                  สมัครสมาชิก
                </Link>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-3">
              <Link href="/" onClick={closeMobile} className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium">
                <Home className="w-5 h-5 text-gray-400" /> หน้าแรก
              </Link>
              {user && (
                <>
                  <Link href="/orders" onClick={closeMobile} className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium">
                    <ShoppingBag className="w-5 h-5 text-gray-400" /> คำสั่งซื้อของฉัน
                  </Link>
                  <Link href="/notifications" onClick={closeMobile} className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium">
                    <span className="relative">
                      <Bell className="w-5 h-5 text-gray-400" />
                      {mounted && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>
                      )}
                    </span>
                    การแจ้งเตือน
                  </Link>
                  <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium">
                    <Package className="w-5 h-5 text-gray-400" /> จัดการร้านค้า
                  </Link>
                  <Link href="/chat" onClick={closeMobile} className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium">
                    <span className="relative">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      {mounted && unreadChatCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{unreadChatCount > 9 ? "9+" : unreadChatCount}</span>
                      )}
                    </span>
                    แชท
                  </Link>
                  {hasCommunity && (
                    <Link href="/my-community" onClick={closeMobile} className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium">
                      <Store className="w-5 h-5 text-primary-500" /> ชุมชนของฉัน
                    </Link>
                  )}
                </>
              )}

              <Link href="/live" onClick={closeMobile} className="flex items-center gap-3 px-5 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 text-sm font-medium">
                <Radio className="w-5 h-5" /> ไลฟ์สด
              </Link>

              <div className="mx-5 my-2 border-t border-gray-100" />

              {user ? (
                <>
                  <Link
                    href={hasCommunity ? "/my-community" : "/register-community"}
                    onClick={closeMobile}
                    className="mx-5 mt-2 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white font-semibold rounded-xl text-sm hover:bg-primary-700 transition-colors"
                  >
                    <Store className="w-4 h-4" />
                    {hasCommunity ? "ชุมชนของฉัน" : "เปิดร้านชุมชน"}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-5 py-3 text-red-600 hover:bg-red-50 w-full text-left text-sm font-medium mt-1"
                  >
                    <LogOut className="w-5 h-5" /> ออกจากระบบ
                  </button>
                </>
              ) : null}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
