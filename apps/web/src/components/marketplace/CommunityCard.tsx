import Link from "next/link"
import Image from "next/image"
import { MapPin, Package, Star } from "lucide-react"
import type { Community } from "@cm/types"

interface CommunityCardProps {
  community: Community & { productCount: number; rating?: number }
}

export function CommunityCard({ community }: CommunityCardProps) {
  return (
    <Link href={`/communities/${community.slug}`} className="group">
      <div className="card hover:shadow-md transition-shadow overflow-hidden p-0">
        {/* Banner */}
        <div className="relative h-28 bg-gradient-to-br from-primary-400 to-primary-600">
          {community.bannerUrl && (
            <Image src={community.bannerUrl} alt="" fill className="object-cover" />
          )}
          {community.isVerified && (
            <span className="absolute top-2 right-2 bg-white text-primary-600 text-xs font-bold px-2 py-0.5 rounded-full">
              ✓ ยืนยันแล้ว
            </span>
          )}
        </div>

        <div className="p-4">
          {/* Logo + Name */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-primary-100 overflow-hidden flex-shrink-0">
              {community.logoUrl ? (
                <Image src={community.logoUrl} alt={community.name} width={44} height={44} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary-600 font-bold text-lg">
                  {community.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1 group-hover:text-primary-600 transition-colors">
                {community.name}
              </h3>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
            <MapPin className="w-3 h-3" />
            <span>{community.district}, {community.province}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {community.productCount} สินค้า
            </span>
            {community.rating && (
              <span className="flex items-center gap-1 text-yellow-600">
                <Star className="w-3 h-3 fill-current" />
                {community.rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span>{community.memberCount} สมาชิก</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
