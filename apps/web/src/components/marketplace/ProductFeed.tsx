"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { MapPin, Loader2 } from "lucide-react"
import { ProductCard } from "./ProductCard"
import { api } from "@/lib/api"
import { useGeolocation } from "@/lib/hooks/useGeolocation"
import type { ProductWithShop } from "@cm/types"

function NearMeToggle({ geo }: { geo: ReturnType<typeof useGeolocation> }) {
  const active = geo.status === "granted"
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={geo.request}
        disabled={geo.status === "loading"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-60 ${
          active
            ? "bg-primary-600 text-white border-primary-600"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        }`}
      >
        {geo.status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
        {active ? "ใกล้ฉัน (เรียงตามระยะทาง)" : "ใกล้ฉัน"}
      </button>
      {geo.status === "denied" && (
        <span className="text-xs text-gray-400">ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — เปิดสิทธิ์ในเบราว์เซอร์แล้วลองใหม่</span>
      )}
      {geo.status === "unsupported" && (
        <span className="text-xs text-gray-400">เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง</span>
      )}
    </div>
  )
}

function ProductFeedInner() {
  const searchParams = useSearchParams()
  const category = searchParams.get("category") || ""
  const geo = useGeolocation()
  const origin = geo.status === "granted" ? { lat: geo.lat, lng: geo.lng } : null

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category, origin?.lat, origin?.lng],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "40" })
      if (category) params.set("category", category)
      if (origin) { params.set("lat", String(origin.lat)); params.set("lng", String(origin.lng)) }
      const res = await api.get<{ data: ProductWithShop[] }>(`/products?${params}`)
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <>
        <NearMeToggle geo={geo} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card animate-pulse p-0 overflow-hidden">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (!products?.length) {
    return (
      <>
        <NearMeToggle geo={geo} />
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">{origin ? "ไม่พบสินค้าใกล้คุณ" : "ไม่พบสินค้าในหมวดหมู่นี้"}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <NearMeToggle geo={geo} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}

export function ProductFeed() {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card animate-pulse p-0 overflow-hidden">
            <div className="aspect-square bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    }>
      <ProductFeedInner />
    </Suspense>
  )
}
