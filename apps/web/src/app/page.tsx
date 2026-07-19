import { Suspense } from "react"
import { MainNav } from "@/components/layout/MainNav"
import { HeroSection } from "@/components/marketplace/HeroSection"
import { PromoBanner } from "@/components/marketplace/PromoBanner"
import { CommunityGrid } from "@/components/marketplace/CommunityGrid"
import { ProductFeed } from "@/components/marketplace/ProductFeed"
import { CategoryBar } from "@/components/marketplace/CategoryBar"
import { LiveRow } from "@/components/marketplace/LiveRow"
import { PopularProductsRow } from "@/components/marketplace/PopularProductsRow"
import { FlashSaleRow } from "@/components/marketplace/FlashSaleRow"

export default function HomePage() {
  return (
    <main>
      <MainNav />
      <HeroSection />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <LiveRow />
        <PromoBanner />

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">ชุมชนแนะนำ</h2>
          <Suspense fallback={<div className="text-gray-400">กำลังโหลด...</div>}>
            <CommunityGrid />
          </Suspense>
        </section>

        <Suspense fallback={null}>
          <FlashSaleRow />
        </Suspense>

        <Suspense fallback={null}>
          <PopularProductsRow />
        </Suspense>

        <CategoryBar />

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">สินค้าทั้งหมด</h2>
          <Suspense fallback={<div className="text-gray-400">กำลังโหลด...</div>}>
            <ProductFeed />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
