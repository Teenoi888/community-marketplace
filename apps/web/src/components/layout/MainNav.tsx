"use client"
import Link from "next/link"
import { ShoppingCart, Search, Bell, Menu, Store, User, LogOut, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "@/lib/store/auth"
import { useCartStore } from "@/lib/store/cart"
import { api } from "@/lib/api"

export function MainNav() {
  const [searchQuery, setSearchQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasCommunity, setHasCommunity] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, setUser, logout } = useAuthStore()
  const cartCount = useCartStore((s) => s.itemCount())
  const [mounted, setMounted] = useState(false)

  // Restore session from localStorage token on mount
  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem("access_token")
    if (token && !user) {
      api.get("/auth/me").then(res => {
        if (res.data?.data) setUser(res.data.data)
      }).catch(() => {
        localStorage.removeItem("access_token")
      })
    }
  }, [])

  // Check if user already has a community → change top-right button
  useEffect(() => {
    if (user) {
      api.get("/communities/my")
        .then(() => setHasCommunity(true))
        .catch(() => setHasCommunity(false))
    } else {
      setHasCommunity(false)
    }
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:block">ตลาดชุมชน</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="ค้นหาสินค้า ชุมชน จังหวัด..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/cart" className="relative p-2 text-gray-600 hover:text-gray-900">
              <ShoppingCart className="w-5 h-5" />
              {mounted && cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </Link>
            <Link href="/notifications" className="p-2 text-gray-600 hover:text-gray-900 hidden sm:block">
              <Bell className="w-5 h-5" />
            </Link>
            {user ? (
              <div ref={menuRef} className="relative hidden sm:block">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                    <Link href="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <ShoppingCart className="w-4 h-4" />คำสั่งซื้อของฉัน
                    </Link>
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Store className="w-4 h-4" />จัดการร้านค้า
                    </Link>
                    {hasCommunity && (
                      <Link href="/my-community" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Store className="w-4 h-4 text-primary-600" />ชุมชนของฉัน
                      </Link>
                    )}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => { logout(); setMenuOpen(false) }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm hidden sm:block">เข้าสู่ระบบ</Link>
            )}
            {/* Top-right button: "ชุมชนของฉัน" if has community, "เปิดร้านชุมชน" if not */}
            {user && hasCommunity ? (
              <Link href="/my-community" className="btn-outline text-sm hidden lg:block">ชุมชนของฉัน</Link>
            ) : (
              <Link href="/register-community" className="btn-outline text-sm hidden lg:block">เปิดร้านชุมชน</Link>
            )}
            <button className="p-2 text-gray-600 sm:hidden">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
