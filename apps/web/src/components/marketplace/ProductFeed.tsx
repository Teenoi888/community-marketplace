"use client"
import { useQuery } from "@tanstack/react-query"
import { ProductCard } from "./ProductCard"
import { api } from "@/lib/api"
import type { ProductWithShop } from "@cm/types"

async function fetchProducts(): Promise<ProductWithShop[]> {
  const res = await api.get<{ data: ProductWithShop[] }>("/products?limit=20")
  return res.data.data
}

export function ProductFeed() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  })

  if (isLoading) {
    return (
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
    )
  }

  if (!products?.length) {
    return <div className="text-gray-400 text-sm text-center py-12">ยังไม่มีสินค้าในระบบ</div>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
