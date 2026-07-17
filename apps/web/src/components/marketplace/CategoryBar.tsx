"use client"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"

interface Category {
  id: string
  slug: string
  name: string
  emoji: string
}

const ALL = { id: "all", slug: "all", name: "ทั้งหมด", emoji: "" }

function CategoryBarInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get("category") || "all"
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    api.get("/categories")
      .then(r => setCategories(r.data.data || []))
      .catch(() => {})
  }, [])

  function select(slug: string) {
    if (slug === "all") {
      router.push("/", { scroll: false })
    } else {
      router.push(`/?category=${slug}`, { scroll: false })
    }
  }

  const items = [ALL, ...categories]

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => select(cat.slug)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
            active === cat.slug
              ? "bg-primary-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

export function CategoryBar() {
  return (
    <Suspense fallback={
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
        ))}
      </div>
    }>
      <CategoryBarInner />
    </Suspense>
  )
}
