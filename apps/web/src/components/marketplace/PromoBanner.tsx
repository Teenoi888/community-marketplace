"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Sparkles, Truck, Store, Percent } from "lucide-react"

interface Slide {
  icon: typeof Sparkles
  title: string
  subtitle: string
  cta: string
  href: string
  gradient: string
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: "เปิดร้านชุมชนฟรี วันนี้",
    subtitle: "ไม่มีค่าธรรมเนียมเปิดร้าน เริ่มขายได้ทันที",
    cta: "เปิดร้านเลย",
    href: "/register-community",
    gradient: "from-primary-600 to-emerald-700",
  },
  {
    icon: Percent,
    title: "GP ต่ำที่สุด รายได้ถึงมือชาวบ้านเต็มๆ",
    subtitle: "ไม่โดนหักค่าธรรมเนียมแบบแพลตฟอร์มทั่วไป",
    cta: "ดูสินค้าชุมชน",
    href: "/#communities",
    gradient: "from-amber-600 to-orange-700",
  },
  {
    icon: Truck,
    title: "จัดส่งครอบคลุมทั่วไทย",
    subtitle: "เชื่อมสินค้าท้องถิ่นจาก 77 จังหวัดถึงมือคุณ",
    cta: "เลือกซื้อสินค้า",
    href: "/#products",
    gradient: "from-sky-600 to-blue-700",
  },
  {
    icon: Store,
    title: "สนับสนุนวิสาหกิจชุมชนไทย",
    subtitle: "ทุกออเดอร์ คือรายได้ที่กลับไปสู่ท้องถิ่น",
    cta: "อ่านเพิ่มเติม",
    href: "/#communities",
    gradient: "from-rose-600 to-pink-700",
  },
]

const INTERVAL_MS = 4500

export function PromoBanner() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused])

  function goTo(i: number) {
    setIndex((i + SLIDES.length) % SLIDES.length)
  }

  return (
    <section
      className="relative rounded-2xl overflow-hidden shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative h-40 md:h-52">
        {SLIDES.map((slide, i) => {
          const Icon = slide.icon
          return (
            <Link
              key={slide.title}
              href={slide.href}
              className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} text-white transition-opacity duration-700 ease-in-out flex items-center ${
                i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
            >
              <div className="max-w-7xl mx-auto px-6 md:px-10 w-full flex items-center gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-2xl font-bold leading-tight">{slide.title}</h3>
                  <p className="text-white/85 text-sm md:text-base mt-1">{slide.subtitle}</p>
                  <span className="inline-block mt-2 text-sm font-semibold underline underline-offset-4">
                    {slide.cta}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Prev / Next */}
      <button
        onClick={() => goTo(index - 1)}
        aria-label="ก่อนหน้า"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => goTo(index + 1)}
        aria-label="ถัดไป"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            onClick={() => goTo(i)}
            aria-label={`ไปสไลด์ ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
