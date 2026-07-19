"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Package, Store } from "lucide-react"
import { MainNav } from "@/components/layout/MainNav"
import { ProductCard } from "@/components/marketplace/ProductCard"
import { CommunityCard } from "@/components/marketplace/CommunityCard"
import { api } from "@/lib/api"
import type { ProductWithShop, Community } from "@cm/types"

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get("q") || ""

  const PRODUCTS_PER_PAGE = 24

  const [products, setProducts] = useState<ProductWithShop[]>([])
  const [communities, setCommunities] = useState<(Community & { productCount: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(q)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setQuery(q)
    setPage(1)
    if (!q) {
      setProducts([])
      setCommunities([])
      setHasMore(false)
      setLoading(false)
      return
    }
    setLoading(true)
    // Pass search term as both `search` (name match) and `province` (location match)
    // so searching "เชียงใหม่" returns both name-matched AND province-matched results
    const enc = encodeURIComponent(q)
    Promise.all([
      api.get(`/products?search=${enc}&province=${enc}&limit=${PRODUCTS_PER_PAGE}&page=1`),
      api.get(`/communities?search=${enc}&limit=12`),
    ])
      .then(([p, c]) => {
        const productRows = p.data.data || []
        setProducts(productRows)
        setHasMore(productRows.length === PRODUCTS_PER_PAGE)
        setCommunities(c.data.data || [])
      })
      .catch(() => {
        setProducts([])
        setCommunities([])
        setHasMore(false)
      })
      .finally(() => setLoading(false))
  }, [q])

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const enc = encodeURIComponent(q)
      const r = await api.get(`/products?search=${enc}&province=${enc}&limit=${PRODUCTS_PER_PAGE}&page=${nextPage}`)
      const rows = r.data.data || []
      setProducts(prev => [...prev, ...rows])
      setHasMore(rows.length === PRODUCTS_PER_PAGE)
      setPage(nextPage)
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  const hasResults = products.length > 0 || communities.length > 0

  return (
    <main className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="relative mb-8 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาสินค้า ชุมชน จังหวัด..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            autoFocus
          />
        </form>

        {!q ? (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>พิมพ์คำค้นหาด้านบนเพื่อเริ่มค้นหา</p>
          </div>
        ) : loading ? (
          <div className="text-center py-20 text-gray-400">กำลังค้นหา...</div>
        ) : !hasResults ? (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>ไม่พบผลลัพธ์สำหรับ &ldquo;{q}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-10">
            {communities.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary-600" />
                  ชุมชน ({communities.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {communities.map((c) => (
                    <CommunityCard key={c.id} community={c} />
                  ))}
                </div>
              </section>
            )}

            {products.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-600" />
                  สินค้า ({products.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SearchResults />
    </Suspense>
  )
}
