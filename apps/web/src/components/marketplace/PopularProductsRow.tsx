import Link from "next/link"
import Image from "next/image"
import { Star, TrendingUp } from "lucide-react"

async function getPopularProducts() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/recommendations/home`,
      { cache: "no-store" }
    )
    if (!res.ok) return []
    const j = await res.json()
    return j.data || []
  } catch {
    return []
  }
}

export async function PopularProductsRow() {
  const products = await getPopularProducts()
  if (!products.length) return null

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary-500" />
        สินค้ายอดนิยม
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((p: any) => (
          <Link key={p.id} href={`/products/${p.id}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="relative aspect-square bg-gray-100">
              {p.images?.[0]
                ? <Image src={p.images[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-full flex items-center justify-center text-4xl">🛒</div>
              }
              {p.orderCount > 0 && (
                <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  ขายแล้ว {p.orderCount}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors h-10">
                {p.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{p.shop.community.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-primary-600 font-bold">฿{Number(p.price).toLocaleString()}</span>
                {p.avgRating > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">{Number(p.avgRating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
