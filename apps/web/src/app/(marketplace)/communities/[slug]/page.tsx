import Image from "next/image"
import { MapPin, Package, Users } from "lucide-react"
import { ProductCard } from "@/components/marketplace/ProductCard"
import { JoinCommunityActions } from "@/components/community/JoinCommunityActions"

interface Props { params: { slug: string } }

async function getCommunity(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/communities/${slug}`,
    { cache: "no-store" }
  )
  if (!res.ok) return null
  return res.json()
}

export default async function CommunityPage({ params }: Props) {
  const res = await getCommunity(params.slug)

  if (!res?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        ไม่พบชุมชนนี้
      </div>
    )
  }

  const { community, products } = res.data

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Banner */}
      <div className="relative h-44 md:h-56 bg-gradient-to-br from-primary-400 to-primary-700">
        {community.bannerUrl && (
          <Image src={community.bannerUrl} alt="" fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Profile strip: Logo ซ้อน banner + ชื่อ + ปุ่ม */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">

            {/* Logo — ดึงขึ้นไปซ้อน banner ด้วย -mt-14 */}
            <div className="relative -mt-14 z-10 w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
              {community.logoUrl ? (
                <Image src={community.logoUrl} alt={community.name} width={96} height={96} className="object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-3xl">
                  {community.name.charAt(0)}
                </div>
              )}
            </div>

            {/* ชื่อ + ที่อยู่ */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{community.name}</h1>
              <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {community.district}, {community.province}
              </div>
            </div>

            {/* Join / Open shop actions */}
            <div className="flex-shrink-0">
              <JoinCommunityActions communityId={community.id} communityName={community.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Stats */}
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
        {products?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-12">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีสินค้าในชุมชนนี้</p>
          </div>
        )}
      </div>
    </main>
  )
}
