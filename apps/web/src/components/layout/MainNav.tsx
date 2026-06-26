"use client"
import Link from "next/link"
import { ShoppingCart, Search, Bell, Menu, Store } from "lucide-react"
import { useState } from "react"

export function MainNav() {
  const [searchQuery, setSearchQuery] = useState("")

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
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">0</span>
            </Link>
            <Link href="/notifications" className="p-2 text-gray-600 hover:text-gray-900 hidden sm:block">
              <Bell className="w-5 h-5" />
            </Link>
            <Link href="/login" className="btn-primary text-sm hidden sm:block">เข้าสู่ระบบ</Link>
            <Link href="/register-community" className="btn-outline text-sm hidden lg:block">เปิดร้านชุมชน</Link>
            <button className="p-2 text-gray-600 sm:hidden">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
