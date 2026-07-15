import Link from "next/link"
import Image from "next/image"
import { FlashSaleBadge } from "./FlashSaleBadge"

async function getFlashSales() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/flash-sales`,
      { cache: "no-store" }
    )
    if (!res.ok) return []
    const j = await res.json()
    return j.data || []
  } catch {
    return []
  }
}

export async function FlashSaleRow() {
  const sales = await getFlashSales()
  if (!sales.length) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-xl">
          <span className="text-lg">⚡</span>
          <span className="font-bold text-sm">Flash Sale</span>
        </div>
        <span className="text-gray-500 text-sm">โปรโมชั่นชั่วคราว — รีบซื้อก่อนหมดเวลา!</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sales.map((sale: any) => {
          const p = sale.product
          if (!p) return null
          const originalPrice = Number(p.price)
          const discountedPrice = sale.discountedPrice ?? Math.round(originalPrice * (1 - sale.discountPct / 100))

          return (
            <Link key={sale.id} href={`/products/${p.id}`}
              className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group relative">
              <div className="relative aspect-square bg-gray-100">
                {p.images?.[0]
                  ? <Image src={p.images[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl">🛒</div>
                }
                <FlashSaleBadge discountPct={sale.discountPct} endsAt={sale.endsAt} size="sm" />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors h-10">
                  {p.name}
                </p>
                <div className="mt-1.5">
                  <span className="text-red-600 font-bold">฿{discountedPrice.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 line-through ml-1.5">฿{originalPrice.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
