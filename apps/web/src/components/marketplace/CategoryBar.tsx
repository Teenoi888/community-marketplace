"use client"
import { useState } from "react"

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด", emoji: "🛒" },
  { id: "agriculture", label: "เกษตร", emoji: "🌾" },
  { id: "processed_food", label: "อาหารแปรรูป", emoji: "🥫" },
  { id: "fresh_produce", label: "ผักผลไม้สด", emoji: "🥬" },
  { id: "handicraft", label: "งานฝีมือ", emoji: "🧶" },
  { id: "herb", label: "สมุนไพร", emoji: "🌿" },
  { id: "seafood", label: "ประมง", emoji: "🐟" },
  { id: "beverage", label: "เครื่องดื่ม", emoji: "🍵" },
  { id: "otop", label: "OTOP", emoji: "🏆" },
]

export function CategoryBar() {
  const [active, setActive] = useState("all")

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setActive(cat.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
            active === cat.id
              ? "bg-primary-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600"
          }`}
        >
          <span>{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </div>
  )
}
