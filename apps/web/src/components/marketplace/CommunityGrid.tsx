"use client"
import { useQuery } from "@tanstack/react-query"
import { CommunityCard } from "./CommunityCard"
import { api } from "@/lib/api"
import type { Community } from "@cm/types"

type CommunityWithStats = Community & { productCount: number; rating?: number }

async function fetchFeaturedCommunities(): Promise<CommunityWithStats[]> {
  const res = await api.get<{ data: CommunityWithStats[] }>("/communities?featured=true&limit=8")
  return res.data.data
}

export function CommunityGrid() {
  const { data: communities, isLoading, error } = useQuery({
    queryKey: ["communities", "featured"],
    queryFn: fetchFeaturedCommunities,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-52 p-0">
            <div className="h-28 bg-gray-200 rounded-t-xl" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !communities?.length) {
    return <div className="text-gray-400 text-sm">ยังไม่มีชุมชนในระบบ</div>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {communities.map((community) => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
  )
}
