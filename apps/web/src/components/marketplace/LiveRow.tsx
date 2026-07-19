"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Users } from "lucide-react"

interface LiveSession {
  id: string
  title: string
  shop_name: string
  seller_name: string
  avatar_url: string | null
  viewer_count: number
  community_slug: string
}

export function LiveRow() {
  const [sessions, setSessions] = useState<LiveSession[]>([])

  useEffect(() => {
    api.get("/live").then(r => setSessions(r.data.data || [])).catch(() => {})
    const t = setInterval(() => {
      api.get("/live").then(r => setSessions(r.data.data || [])).catch(() => {})
    }, 15000)
    return () => clearInterval(t)
  }, [])

  if (!sessions.length) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE อยู่ตอนนี้
        </span>
        <span className="text-sm text-gray-500">{sessions.length} ร้าน</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {sessions.map(s => (
          <Link
            key={s.id}
            href={`/live/${s.id}`}
            className="flex-shrink-0 w-44 group"
          >
            {/* Thumbnail */}
            <div className="relative w-44 h-28 bg-gray-900 rounded-xl overflow-hidden mb-2">
              {s.avatar_url ? (
                <img src={s.avatar_url} alt={s.shop_name} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900 to-gray-900">
                  <span className="text-3xl font-bold text-white/30">{s.shop_name[0]}</span>
                </div>
              )}
              {/* LIVE badge */}
              <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
              {/* Viewer count */}
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                <Users className="w-2.5 h-2.5" /> {s.viewer_count}
              </span>
            </div>
            {/* Info */}
            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary-600 transition-colors">{s.shop_name}</p>
            <p className="text-xs text-gray-500 truncate">{s.title}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
