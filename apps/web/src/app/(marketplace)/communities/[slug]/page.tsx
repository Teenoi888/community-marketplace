import Image from "next/image"
import { MapPin, Package, Users, Star } from "lucide-react"
import { ProductCard } from "@/components/marketplace/ProductCard"

interface Props { params: { slug: string } }

async function getCommunity(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/communities/${slug}`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return null
  return res.json()
}

export default async function CommunityPage({ params }: Props) {
  const data = await getCommunity(params.slug)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        ไม่พบชุมชนนี้
      </div>
    )
  }

  const { community, products } = data

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary-400 to-primary-700">
        {community.bannerUrl && (
          <Image src={community.bannerUrl} alt="" fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 mb-6 flex items-end gap-4">
          <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
            {community.logoUrl ? (
              <Image src={community.logoUrl} alt={community.name} width={96} height={96} className="object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-3xl">
                {community.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold text-white drop-shadow">{community.name}</h1>
            <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {community.district}, {community.province}
            </div>
          </div>
        </div>

        <div className="flex gap-6 mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4 text-primary-500" />
            <span className="font-semibold">{products?.length ?? 0}</span> สินค้า
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-primary-500" />
            <span className="font-semibold">{community.memberCount}</span> สมาชิก
          </div>
        </div>

        {community.description && (
          <p className="text-gray-600 mb-6 leading-relaxed">{community.description}</p>
        )}

        <h2 className="text-xl font-bold text-gray-800 mb-4">สินค้าในชุมชน</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-12">
          {products?.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  )
}
